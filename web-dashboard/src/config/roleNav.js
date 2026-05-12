/**
 * Role-based navigation and route access (SRS Appendix A, FR-003 scopes).
 * Sidebar and <RequireRole> both use this so menus and deep links stay aligned.
 */

const R = {
  caregiver: 'caregiver',
  chw: 'chw',
  centre_mgr: 'centre_mgr',
  sector: 'sector',
  district: 'district',
  national: 'national',
  sys_admin: 'sys_admin',
  partner: 'partner',
}

const CLINICAL = [R.caregiver, R.chw, R.centre_mgr]
const SUPERVISORY = [R.sector, R.district, R.national]
const COORDINATION = [...SUPERVISORY, R.sys_admin]
const ALL = Object.values(R)

/**
 * Each key matches a <Route path="…"> segment (index = dashboard).
 * `roles`: who may open this route (URL guard).
 * `sidebar`: if false, route exists but is not shown in the nav (e.g. nested).
 */
export const ROUTES = {
  index: {
    segment: '',
    to: '/',
    label: 'Dashboard',
    icon: 'home',
    end: true,
    roles: ALL,
    sidebar: true,
  },
  children: {
    segment: 'children',
    to: '/children',
    label: 'Children',
    icon: 'children',
    end: false,
    roles: [...CLINICAL, ...SUPERVISORY, R.sys_admin],
    sidebar: true,
  },
  alerts: {
    segment: 'alerts',
    to: '/alerts',
    label: 'Alerts',
    icon: 'alerts',
    end: false,
    roles: [...CLINICAL, ...SUPERVISORY, R.sys_admin],
    sidebar: true,
  },
  referrals: {
    segment: 'referrals',
    to: '/referrals',
    label: 'Referrals',
    icon: 'alerts',
    end: false,
    roles: [...CLINICAL, ...SUPERVISORY, R.sys_admin],
    sidebar: true,
  },
  'sms-inbox': {
    segment: 'sms-inbox',
    to: '/sms-inbox',
    label: 'SMS inbox',
    icon: 'sms',
    end: false,
    roles: [...CLINICAL, ...COORDINATION],
    sidebar: true,
  },
  reports: {
    segment: 'reports',
    to: '/reports',
    label: 'Reports',
    icon: 'reports',
    end: false,
    roles: [...CLINICAL, ...SUPERVISORY, R.sys_admin],
    sidebar: true,
  },
  staff: {
    segment: 'staff',
    to: '/staff',
    label: 'Staff',
    icon: 'users',
    end: false,
    roles: [R.centre_mgr, R.sys_admin],
    sidebar: true,
  },
  'sync-conflicts': {
    segment: 'sync-conflicts',
    to: '/sync-conflicts',
    label: 'Sync conflicts',
    icon: 'alerts',
    end: false,
    roles: [R.centre_mgr, R.sys_admin],
    sidebar: true,
  },
  'food-stock': {
    segment: 'food-stock',
    to: '/food-stock',
    label: 'Food stock',
    icon: 'reports',
    end: false,
    roles: [R.centre_mgr, R.sys_admin],
    sidebar: true,
  },
  'sms-campaign': {
    segment: 'sms-campaign',
    to: '/sms-campaign',
    label: 'SMS campaigns',
    icon: 'sms',
    end: false,
    roles: [R.sector, R.district, R.national, R.sys_admin],
    sidebar: true,
  },
  'report-builder': {
    segment: 'report-builder',
    to: '/report-builder',
    label: 'Report builder',
    icon: 'reports',
    end: false,
    roles: [R.national, R.sys_admin],
    sidebar: true,
  },
  users: {
    segment: 'users',
    to: '/users',
    label: 'Users',
    icon: 'users',
    end: false,
    roles: [R.sys_admin],
    sidebar: true,
  },
  'admin-tools': {
    segment: 'admin-tools',
    to: '/admin-tools',
    label: 'System tools',
    icon: 'users',
    end: false,
    roles: [R.sys_admin],
    sidebar: true,
  },
}

const ORDER = [
  'index',
  'children',
  'alerts',
  'referrals',
  'sms-inbox',
  'reports',
  'staff',
  'sync-conflicts',
  'food-stock',
  'sms-campaign',
  'report-builder',
  'users',
  'admin-tools',
]

export function getSidebarLinks(role) {
  const r = role || R.caregiver
  return ORDER.map(k => ROUTES[k])
    .filter(def => def.sidebar && def.roles.includes(r))
    .map(def => ({
      to: def.to,
      label: def.label,
      icon: def.icon,
      end: def.end,
    }))
}

export function roleMayAccessRouteKey(role, routeKey) {
  const def = ROUTES[routeKey]
  if (!def) return false
  return def.roles.includes(role || R.caregiver)
}

/** React Router path segment (no leading slash), or '' for index. */
export function roleMayAccessPath(role, pathSegment) {
  const r = role || R.caregiver
  const entry = Object.entries(ROUTES).find(([, d]) => d.segment === (pathSegment || ''))
  if (!entry) return false
  return entry[1].roles.includes(r)
}
