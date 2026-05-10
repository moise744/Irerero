// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const nav = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const u = username.trim()
      const p = password
      if (!u) {
        setError('Enter a username.')
        return
      }
      await login(u, p)
      nav('/', { replace: true })
    } catch (err) {
      const d = err.response?.data
      const parts = []
      if (typeof d?.detail === 'string' && d.detail.trim()) parts.push(d.detail.trim())
      if (Array.isArray(d?.non_field_errors)) parts.push(...d.non_field_errors.map(String))
      else if (typeof d?.non_field_errors === 'string') parts.push(d.non_field_errors)
      if (typeof d?.username === 'string') parts.push(d.username)
      if (Array.isArray(d?.username)) parts.push(...d.username.map(String))
      if (typeof d?.password === 'string') parts.push(d.password)
      if (Array.isArray(d?.password)) parts.push(...d.password.map(String))
      let msg = parts.filter(Boolean).join(' ').trim()
      if (!msg && err.code === 'ERR_NETWORK')
        msg =
          'Cannot reach the API (port 8000). Allow TCP 8000 in Windows Firewall and open http://' +
          window.location.hostname +
          ':8000/ on your phone.'
      if (!msg)
        msg = err.response?.status
          ? `Login failed (HTTP ${err.response.status}). Re-run: python manage.py seed_demo_data`
          : 'Login failed. Check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-primary text-stone-100 flex-col justify-between p-10 xl:p-14 border-r border-black/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/50 to-primary-light/50 opacity-50 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-10">
          <p className="font-display text-3xl xl:text-4xl font-semibold tracking-tight text-white">Irerero</p>
          <p className="mt-4 text-sm text-teal-soft/80 leading-relaxed max-w-sm font-sans">
            Monitoring, attendance, and alerts for early childhood development programmes — built for teams working
            across centres and sectors.
          </p>
        </div>
        <p className="text-xs text-white/60 relative z-10">Secure sign-in · Role-based access</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-canvas relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal/5 rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
        <div className="w-full max-w-[400px] rounded-2xl border border-white bg-white shadow-xl px-8 py-9 relative z-10 backdrop-blur-sm bg-white/90">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">Sign in</h1>
            <p className="text-sm text-stone-500 mt-2 font-sans">Use your programme account.</p>
          </div>
          {error && (
            <div className="mb-5 p-3 rounded-lg border border-danger/20 bg-danger/5 text-danger text-sm leading-snug">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="ir-username" className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1.5">
                Username
              </label>
              <input
                id="ir-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-ink text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-sm"
                placeholder="e.g. sector01"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="ir-password" className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                id="ir-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-ink text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient py-3 rounded-lg text-sm font-semibold tracking-wide disabled:opacity-55 transition-all"
            >
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>
          <div className="text-center text-xs text-stone-400 mt-6 space-y-2">
            <p>
              Forgot password? <a href="mailto:admin@irerero.rw" className="text-primary hover:underline font-medium">Contact SysAdmin</a> to reset it.
            </p>
            <p>
              Demo: <span className="text-stone-600">caregiver01</span> / Irerero2025!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
