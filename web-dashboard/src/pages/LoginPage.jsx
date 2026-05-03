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
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-[#0f2d26] text-stone-100 flex-col justify-between p-10 xl:p-14 border-r border-black/10">
        <div>
          <p className="font-display text-3xl xl:text-4xl font-semibold tracking-tight text-white">Irerero</p>
          <p className="mt-4 text-sm text-teal-100/85 leading-relaxed max-w-sm">
            Monitoring, attendance, and alerts for early childhood development programmes — built for teams working
            across centres and sectors.
          </p>
        </div>
        <p className="text-xs text-teal-200/60">Secure sign-in · Role-based access</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-stone-100">
        <div className="w-full max-w-[400px] rounded-xl border border-stone-200/90 bg-white shadow-sm px-8 py-9">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-stone-900 tracking-tight">Sign in</h1>
            <p className="text-sm text-stone-500 mt-2">Use your programme account.</p>
          </div>
          {error && (
            <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm leading-snug">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="ir-username" className="block text-xs font-medium text-stone-600 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <input
                id="ir-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-700/25 focus:border-teal-700"
                placeholder="e.g. sector01"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="ir-password" className="block text-xs font-medium text-stone-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                id="ir-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-700/25 focus:border-teal-700"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f2d26] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#163d34] disabled:opacity-55 transition-colors"
            >
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-8">
            Demo: <span className="text-stone-600">caregiver01</span> / Irerero2025!
          </p>
        </div>
      </div>
    </div>
  )
}
