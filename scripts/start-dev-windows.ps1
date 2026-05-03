# Irerero — start API + Web dashboard on Windows (two PowerShell windows).
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-windows.ps1
#
# On this PC open: http://127.0.0.1:3000/
# From your phone (same Wi‑Fi): http://<your-PC-LAN-IPv4>:3000/

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backend = Join-Path $root "backend"
$web = Join-Path $root "web-dashboard"

if (-not (Test-Path (Join-Path $backend "venv\Scripts\python.exe"))) {
  Write-Host "ERROR: backend venv missing. Run: cd backend ; python -m venv venv ; .\venv\Scripts\Activate.ps1 ; pip install -r requirements.txt" -ForegroundColor Red
  exit 1
}

# Allow Django Host header validation when browsing from LAN (phone / tablet)
$extras = @()
try {
  $extras = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.)' } |
    Select-Object -ExpandProperty IPAddress |
    Sort-Object -Unique)
}
catch {}

$hostsList = @('localhost', '127.0.0.1', '[::1]', '0.0.0.0', '10.0.2.2') + $extras
$DJANGO_ALLOWED_HOSTS = ([string]::Join(' ', ($hostsList | Sort-Object -Unique)))

Write-Host "`nDJANGO_ALLOWED_HOSTS → $DJANGO_ALLOWED_HOSTS" -ForegroundColor DarkGray
if ($extras.Count -gt 0) {
  Write-Host "Phone / other devices on Wi‑Fi: http://$($extras[0]):3000/  (and API :8000 on same IP)" -ForegroundColor Yellow
}

$daphne = Join-Path $backend "venv\Scripts\daphne.exe"
if (-not (Test-Path $daphne)) {
  Write-Host "WARNING: Daphne not found. REST works with runserver but WebSockets return 404. Run: cd backend; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Yellow
}

$runner = Join-Path $backend "_irerero_run_server.ps1"
$py = Join-Path $backend "venv\Scripts\python.exe"
$mg = Join-Path $backend "manage.py"
$hostsLiteral = $DJANGO_ALLOWED_HOSTS.Replace("'", "''")
$backendLiteral = $backend.Replace("'", "''")
$daphneLiteral = $daphne.Replace("'", "''")
$pyLiteral = $py.Replace("'", "''")
$mgLiteral = $mg.Replace("'", "''")
$runnerContent = @"
`$env:DJANGO_ALLOWED_HOSTS = '$hostsLiteral'
Write-Host 'Irerero API - Daphne ASGI (WebSockets + HTTP) 0.0.0.0:8000' -ForegroundColor Green
Set-Location -LiteralPath '$backendLiteral'
if (Test-Path '$daphneLiteral') {
  & '$daphneLiteral' -b 0.0.0.0 -p 8000 irerero_backend.asgi:application
} else {
  Write-Host 'Daphne missing - falling back to runserver (HTTP only; /ws URLs 404).' -ForegroundColor Yellow
  & '$pyLiteral' '$mgLiteral' runserver 0.0.0.0:8000
}
"@
Set-Content -LiteralPath $runner -Value $runnerContent.TrimEnd("`r", "`n") -Encoding UTF8

Write-Host "`nOpening Window 1: Irerero API via Daphne (port 8000, LAN + WebSockets)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
  "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $runner
)

Start-Sleep -Seconds 2

Write-Host "Opening Window 2: Vite web dashboard (port 3000, network reachable)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $web -ArgumentList @(
  "-NoExit", "-ExecutionPolicy", "Bypass", "-Command",
  "Write-Host 'Irerero Web Dashboard (vite --host)' -ForegroundColor Green; if (-not (Test-Path node_modules)) { npm install }; npm run dev -- --host"
)

Write-Host "`nDone. Browser on this PC:`n  http://127.0.0.1:3000/`n`nSanity-check API:`n  http://127.0.0.1:8000/`n" -ForegroundColor Green
