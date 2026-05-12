// src/components/layout/Header.jsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'

export default function Header({ title }) {
  const { user, logout } = useAuthStore()
  const nav = useNavigate()

  const handleLogout = async () => {
    await logout()
    nav('/login', { replace: true })
  }

  return (
    <header className="shrink-0 bg-canvas border-b border-border-subtle px-6 py-4 flex items-center justify-between gap-4 shadow-nav">
      <h2 className="text-base font-semibold text-ink-display truncate font-display tracking-wide">{title}</h2>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm text-ink-muted hidden sm:inline max-w-[220px] truncate">
          {user?.full_name}
          <span className="text-ink-placeholder"> · </span>
          <span className="text-ink">{user?.role_display || user?.role}</span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-semibold text-coral hover:text-coral-hover rounded-lg px-3 py-2 hover:bg-coral/10 transition-colors duration-200"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
