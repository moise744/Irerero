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
    <header className="shrink-0 bg-white/90 backdrop-blur-sm border-b border-stone-200 px-6 py-3.5 flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold text-stone-900 truncate font-display">{title}</h2>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm text-stone-500 hidden sm:inline max-w-[220px] truncate">
          {user?.full_name}
          <span className="text-stone-400"> · </span>
          <span className="text-stone-600">{user?.role_display || user?.role}</span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium text-red-700 hover:text-red-800 rounded-md px-2 py-1 -mr-2 hover:bg-red-50 transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
