# Irerero — Full run guide (start to finish)

This guide takes you from a fresh clone (or ZIP) to a **working API + browser dashboard**, with optional **Flutter** apps and **phone-on-Wi‑Fi** testing.

**Customize the repo path:** below, `IRE` means your Irerero project folder (example: `C:\Users\USER\Desktop\final-year-project\Irerero`). Replace it everywhere.

---

## 1. What you will run

| Piece | Folder | Typical command | Default port |
|------|--------|-----------------|--------------|
| **API** | `backend/` | `python manage.py runserver 0.0.0.0:8000` | **8000** |
| **Web UI** | `web-dashboard/` | `npm run dev -- --host` | **3000** (or **3001** if 3000 is busy) |

**Important mental model:**

- **`0.0.0.0:8000`** in the Django log means “listen on all network interfaces.” It is **not** a browser URL.
- To open the API on the same PC, use **`http://127.0.0.1:8000/`** or **`http://localhost:8000/`**.
- The **SPA** loads from Vite (**3000**). **Login sends requests to Django on 8000** on the **same IP** as in the address bar (`web-dashboard/src/services/api.js`).
- Therefore, from a phone, **`http://<PC-ip>:3000/`** can work while **`http://<PC-ip>:8000/`** is blocked — you see the login page but sign-in fails. **Open Windows Firewall TCP 8000** (see §7).

| Folder | Role |
|--------|------|
| `backend/` | Django REST API · SQLite by default · JWT auth |
| `web-dashboard/` | React + Vite + Tailwind |
| `mobile-app/` | Flutter caregiver app (optional) |
| `scripts/start-dev-windows.ps1` | Windows: launches API + web in two windows |

---

## 2. Prerequisites (install once)

1. **Python 3.11+** — check with `python --version`.
2. **Node.js 18+** and **npm** — `node --version`, `npm --version`.
3. **Flutter SDK + Android Studio / SDK + JDK 17** — only if you run `mobile-app/` (Android Studio’s JBR satisfies JDK).

**You do not need** Docker or Redis for a classroom-style demo:

- Database defaults to **SQLite** (`backend/db.sqlite3`).
- With **`DEBUG=True`**, Django **Channels** (WebSockets) uses an **in-memory** layer unless you set **`CHANNEL_LAYER_BACKEND=redis`** and run Redis.

---

## 3. One-time backend setup

**PowerShell (Windows):**

```powershell
cd IRE\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
```

**Success:** `migrate` exits cleanly; seeding prints demo centres, users, children, alerts, etc.

**Every later session:** open a terminal and run `cd IRE\backend` then `.\venv\Scripts\Activate.ps1` before Django commands.

**macOS / Linux** (adjust paths):

```bash
cd IRE/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
```

---

## 4. One-time web dashboard setup

```powershell
cd IRE\web-dashboard
npm install
```

**Success:** `node_modules/` exists and `npm install` finishes without fatal errors.

---

## 5. Start the stack every time you demo

Two processes must stay running:

### 5A — Windows script (recommended)

From **`IRE`** (folder that contains `backend`, `web-dashboard`, `scripts`):

```powershell
cd IRE
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-windows.ps1
```

- Window 1: **Daphne** serving **`irerero_backend.asgi:application`** on **`0.0.0.0:8000`** (HTTP + **WebSockets**). Falls back to **`runserver`** only if Daphne is not installed.
- Window 2: **`npm run dev -- --host`** (Vite on **3000**, LAN-visible).

Copy the **`http://<ip>:3000/`** hint the script prints for your phone. If Vite chooses **3001**, use whatever it prints.

### 5B — Manual — two terminals

**Terminal A — API (use Daphne so `/ws/**` works)**

`python manage.py runserver` is **WSGI-only** in this stack: the dashboard will spam **`Not Found: /ws/alerts/`** because WebSockets never reach Channels. Use **Daphne** (installed via `requirements.txt`):

```powershell
cd IRE\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DJANGO_ALLOWED_HOSTS="localhost 127.0.0.1 [::1] YOUR_WLAN_IPV4"
daphne -b 0.0.0.0 -p 8000 irerero_backend.asgi:application
```

Replace **`YOUR_WLAN_IPV4`** with the address from **`ipconfig`** (often under “Wireless LAN adapter Wi‑Fi” — e.g. `192.168.1.x` or `10.x.x.x`). Use the one that matches the network your phone uses.

**HTTP-only fallback** (no live WebSocket panels):  
`python manage.py runserver 0.0.0.0:8000`

**Permanent `setx`:** only affects **new** terminals; for the **current** window use **`$env:DJANGO_ALLOWED_HOSTS=...`** as above.

**Terminal B — Vite**

```powershell
cd IRE\web-dashboard
npm run dev -- --host
```

Use the **`Local`** / **`Network`** URLs Vite prints (note the port).

---

## 6. URLs: PC vs phone

### On this computer

| What | URL |
|------|-----|
| API home (JSON) | `http://127.0.0.1:8000/` |
| Dashboard | **`http://127.0.0.1:3000/`** or the port Vite shows (e.g. **3001**) |

### On your phone (same Wi‑Fi as the PC)

1. Run **`ipconfig`** → find Wi‑Fi **IPv4** (ignore odd adapters like Hyper-V/WSL unless you really route through them).
2. Dashboard: **`http://<WLAN-IPv4>:<vite-port>/`**
3. **Before logging in**, open **`http://<WLAN-IPv4>:8000/`** on the phone. You must see **`"Irerero Backend is running"`**. If **3000 works** but **8000 does not**, fix **Firewall** (§7).

**`VITE_API_URL`:** do **not** set it to `http://localhost:8000` when testing from a phone — `localhost` would mean the phone, not your PC.

---

## 7. Windows Firewall (very common blocker)

Inbound **TCP 3000** and **TCP 8000** on profile **Private** (or whichever profile your Wi‑Fi uses):

**Windows Security → Firewall & network protection → Advanced settings → Inbound Rules → New Rule → Port → TCP →** specific ports **3000** and **8000** (create one rule each, or combine if your wizard allows).

Repeat until **`http://<PC-ip>:8000/`** loads on the phone.

---

## 8. Accounts and demo walk-through

### Web dashboard (browser)

Use after opening the Vite URL.

| Username | Password | Role |
|----------|----------|------|
| `sector01` | `Irerero2025!` | Sector coordinator |
| `manager01` | `Irerero2025!` | Centre manager |
| `admin` | `Irerero2025!` | System admin |

Suggested path: **Login → Dashboard → Children → Alerts → Reports**.

### API smoke test (PowerShell on PC)

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method POST `
  -Body '{"username":"caregiver01","password":"Irerero2025!"}' -ContentType "application/json"
```

Expect JSON with **`access`** and **`refresh`**.

---

## 9. Mobile app (`mobile-app/` — optional)

### One-time

```powershell
cd IRE\mobile-app
flutter pub get
```

If **`android/`** is missing:

```powershell
flutter create . --project-name irerero --org com.irerero.app --platforms android
```

Backend must remain **`python manage.py runserver 0.0.0.0:8000`** (firewall **8000** for a physical device).

### API base URL examples

**Android emulator** (host reaches your PC):

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

**Physical phone** same Wi‑Fi (PC’s **`ipconfig`** IPv4):

```powershell
flutter devices
flutter run -d <device-id> --dart-define=API_BASE_URL=http://WLAN_IPV4_HERE:8000/api/v1
```

### Typical mobile logins

| Username | Password | Role |
|----------|----------|------|
| `caregiver01` | `Irerero2025!` | Caregiver |
| `manager01` | `Irerero2025!` | Centre manager |

First **`flutter run`** may take minutes (Gradle **`assembleDebug`**); subsequent runs are faster.

---

## 10. PostgreSQL, Redis, Celery (production-style — optional)

For Docker + Postgres + Celery + Redis stacks, follow **`backend/docker-compose`** and project architecture docs — set **`DB_*`** env vars, migrate again, optionally run:

```powershell
celery -A irerero_backend worker -l info
celery -A irerero_backend beat -l info
```

Core browsing and SQLite demos work **without** Celery workers (scheduled jobs simply do not execute until workers run).

---

## 11. Environment variables cheat sheet

| Variable | Typical use |
|----------|--------------|
| `DJANGO_ALLOWED_HOSTS` | Space-separated hosts; must include **`YOUR_WLAN_IPV4`** for phone API calls by IP |
| `DJANGO_DEBUG` | Default `True` in dev · `False` in production tightens defaults |
| `VITE_API_URL` | Overrides API base · **omit** when opening the SPA from **`http://<lan-ip>:3000`** |
| `CHANNEL_LAYER_BACKEND` | Set to **`redis`** only when Redis runs and you want Redis Channels in dev |

---

## 12. Troubleshooting

| Symptom | Likely fix |
|---------|-------------|
| **This site can’t be reached** / `ERR_CONNECTION_REFUSED` | Start both Django and Vite; use correct **port**; PC and phone must share the same routed LAN when testing phone |
| **`ERR_ADDRESS_INVALID`** on `http://0.0.0.0:8000` | Use **`127.0.0.1:8000`** on the PC browser |
| Vite picks **3001** | Something uses **3000** — use **`http://…:3001/`** consistently on PC **and** phone |
| Dashboard opens on phone **but login hangs / fails** | Open **`http://<pc-ip>:8000/`** on the phone · allow **Firewall TCP 8000** · **`DJANGO_ALLOWED_HOSTS`** includes that IP · restart Django |
| Django: **`Not Found: /ws/alerts/`** or **`/ws/sms-log/`** repeating | **`manage.py runserver`** is **WSGI** — Channels WebSockets never register. Run **Daphne**: **`daphne -b 0.0.0.0 -p 8000 irerero_backend.asgi:application`** from **`backend/`** with venv active, or use **`scripts/start-dev-windows.ps1`**. **`pip install -r requirements.txt`** pulls Daphne. |
| Many **`ws proxy`** / **`ECONNRESET`** in Vite terminal | Backend not ASGI reachable, proxy drops · use **Daphne** (above) · **`DEBUG=True`** + in-memory Channels · or Redis + **`CHANNEL_LAYER_BACKEND=redis`** |
| **CORS** errors in desktop browser against LAN | With **`DEBUG=True`**, permissive LAN CORS is enabled; **`CORS_ALLOWED_ORIGIN_REGEXES`** covers private IPs when **`DEBUG=False`** |
| **`cd backend` fails** (**`...\backend\backend`**) | You are already inside **`...\Irerero\backend`** — skip **`cd backend`** and run commands there. Only **`cd backend`** when your prompt is **`...\Irerero>`**. |

---

## 13. Completion checklist

- [ ] `backend/` venv created; **`migrate`** and **`seed_demo_data`** succeeded once  
- [ ] `web-dashboard/` **`npm install`** done once  
- [ ] API: **`daphne -b 0.0.0.0 -p 8000 irerero_backend.asgi:application`** from **`backend/`** (venv active) — **not** plain **`runserver`** if you want **WebSockets**  
- [ ] Vite: **`npm run dev -- --host`** · URL matches terminal  
- [ ] PC: **`http://127.0.0.1:8000/`** and dashboard URL both work; web login succeeds  
- [ ] Phone: **`http://<pc-ip>:8000/`** shows API JSON · then dashboard login succeeds  
- [ ] *(Optional)* Flutter **`API_BASE_URL`** matches PC reachability (**`10.0.2.2`** vs **`WLAN`** IP)

---

**You are done** when dashboard login works on the targets you care about (PC and, if desired, phone) and main screens load without persistent network errors.
