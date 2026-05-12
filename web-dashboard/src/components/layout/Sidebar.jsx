// src/components/layout/Sidebar.jsx — left sidebar navigation (SRS §5.1, Appendix A)
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { getSidebarLinks } from '../../config/roleNav'

function NavGlyph({ name }) {
  const c = 'w-[18px] h-[18px] shrink-0'
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
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

export default function Sidebar() {
  const user = useAuthStore(s => s.user)
  const links = getSidebarLinks(user?.role)

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-canvas flex flex-col border-r border-border-subtle shadow-nav">
      <div className="p-6 border-b border-border-subtle">
        <p className="font-display text-xl font-extrabold text-ink-display tracking-wide">Irerero</p>
        <p className="text-xs text-ink-muted mt-2 leading-relaxed font-medium">Early childhood programmes</p>
        {user?.role_display && (
          <p className="text-[11px] text-forest/90 mt-3 font-semibold tracking-wide uppercase">Role: {user.role_display}</p>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                isActive
                  ? 'bg-coral/12 text-coral shadow-none'
                  : 'text-ink hover:bg-surface-blush/80 hover:text-forest'
              }`
            }
          >
            <NavGlyph name={l.icon} />
            {l.label}
          </NavLink>
        ))}
      </nav>
      {user?.role === 'partner' && (
        <div className="p-4 border-t border-border-subtle text-[11px] text-ink-muted leading-relaxed">
          Partner access is limited to programme-level dashboards. Identifiable child records are not available in this role.
        </div>
      )}
    </aside>
  )
}
