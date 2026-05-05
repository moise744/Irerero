// src/components/layout/Sidebar.jsx — left sidebar navigation (SRS §5.1)
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'

function NavGlyph({ name }) {
  const c = 'w-[18px] h-[18px] shrink-0 opacity-90'
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'home':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1v-8.5z" />
        </svg>
      )
    case 'children':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M12 11a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M4 20a8 8 0 0116 0" />
        </svg>
      )
    case 'alerts':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      )
    case 'sms':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M21 12a8 8 0 01-8 8H6l-4 3V12a8 8 0 018-8h1a8 8 0 018 8z" />
        </svg>
      )
    case 'reports':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M4 19V5" />
          <path d="M4 15h4v4H4zM10 9h4v10h-4zM16 13h4v6h-4z" />
        </svg>
      )
    case 'users':
      return (
        <svg className={c} viewBox="0 0 24 24" aria-hidden {...stroke}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    default:
      return <span className="w-[18px] h-[18px] shrink-0 rounded-sm bg-current opacity-40" aria-hidden />
  }
}

const baseLinks = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/children', label: 'Children', icon: 'children', end: false },
  { to: '/alerts', label: 'Alerts', icon: 'alerts', end: false },
  { to: '/sms-inbox', label: 'SMS Inbox', icon: 'sms', end: false },
  { to: '/reports', label: 'Reports', icon: 'reports', end: false },
]

export default function Sidebar() {
  const role = useAuthStore(s => s.user?.role)
  let links = [...baseLinks]
  
  if (['centre_mgr', 'sys_admin'].includes(role)) {
    links.push({ to: '/staff', label: 'Staff', icon: 'users', end: false })
    links.push({ to: '/sync-conflicts', label: 'Conflicts', icon: 'alerts', end: false })
    links.push({ to: '/food-stock', label: 'Food Stock', icon: 'reports', end: false })
  }
  if (['district', 'national', 'sys_admin'].includes(role)) {
    links.push({ to: '/sms-campaign', label: 'SMS Blast', icon: 'sms', end: false })
  }
  if (role === 'sys_admin') {
    links.push({ to: '/users', label: 'Users', icon: 'users', end: false })
  }

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-primary text-stone-100 flex flex-col border-r border-black/10">
      <div className="p-5 border-b border-white/10">
        <p className="font-display text-xl font-semibold tracking-tight text-white">Irerero</p>
        <p className="text-xs text-teal/90 mt-1.5 leading-snug">Early childhood programmes</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-teal-300/80 ${
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-inner'
                  : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
              }`
            }
          >
            <NavGlyph name={l.icon} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
