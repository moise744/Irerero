// src/pages/DashboardPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../services/api'
import { useAuthStore } from '../hooks/useAuth'
import AlertsPanel from '../components/alerts/AlertsPanel'
import SmsInbox from '../components/sms/SmsInbox'
import StatusDistributionChart from '../components/dashboard/StatusDistributionChart'
import AlertTrendsChart from '../components/dashboard/AlertTrendsChart'
import Header from '../components/layout/Header'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const bar = {
  emerald: 'border-l-sage',
  rose: 'border-l-coral',
  sky: 'border-l-forest',
  amber: 'border-l-amber',
  slate: 'border-l-ink-muted',
}

function StatCard({ label, value, sub, variant = 'slate' }) {
  return (
    <div className={`card pl-5 pr-4 py-6 border-l-4 ${bar[variant]}`}>
      <div className="text-3xl font-extrabold tabular-nums text-ink-display tracking-wide font-display">{value}</div>
      <div className="text-sm font-semibold text-forest mt-2 tracking-wide">{label}</div>
      {sub && <div className="text-xs text-ink-muted mt-1.5 font-normal leading-relaxed">{sub}</div>}
    </div>
  )
}

/** Layout + copy per SRS level: caregiver daily work vs centre oversight vs sector comparison vs district/national aggregates. */
function metaForRole(role) {
  const M = {
    caregiver: {
      headerTitle: 'Daily floor',
      heroTitle: 'Your children today',
      heroSubtitle:
        'Mark attendance, record growth measurements, and act on alerts for children in your ECD room. This view matches how caregivers work on the floor.',
      heroClass: 'border-sage/40 bg-gradient-to-br from-surface-mint/80 to-surface-mint/30',
      layout: 'frontline',
      statusChartTitle: 'Nutritional status at your centre',
      trendsChartTitle: 'Alert activity (your access)',
      drillBack: 'Back to sector centres',
    },
    chw: {
      headerTitle: 'Community support',
      heroTitle: 'Follow-up and alerts',
      heroSubtitle:
        'Track children linked to your centre, prioritise home visits, and support caregivers when measurements or attendance need attention.',
      heroClass: 'border-forest/25 bg-gradient-to-br from-surface-mint/50 to-canvas',
      layout: 'frontline',
      statusChartTitle: 'Nutritional status (linked centre)',
      trendsChartTitle: 'Alert activity (your access)',
      drillBack: 'Back to sector centres',
    },
    centre_mgr: {
      headerTitle: 'Centre oversight',
      heroTitle: 'Your centre at a glance',
      heroSubtitle:
        'Supervise enrolment and nutritional mix, resolve the most urgent alerts first, and prepare reports for the sector coordinator.',
      heroClass: 'border-coral/30 bg-gradient-to-br from-surface-blush/40 to-surface-card',
      layout: 'centre',
      statusChartTitle: 'Nutritional mix (all enrolled children)',
      trendsChartTitle: 'Malnutrition-related alerts over time',
      drillBack: 'Back to sector centres',
    },
    sector: {
      headerTitle: 'Sector comparison',
      heroTitle: 'Centres in your sector',
      heroSubtitle:
        'Compare ECD centres under your supervision, spot high SAM or stunting burden, and plan support visits where they matter most.',
      heroClass: 'border-forest/30 bg-gradient-to-br from-surface-card to-surface-mint/25',
      layout: 'sector',
      statusChartTitle: 'Nutritional status (aggregated)',
      trendsChartTitle: 'Alert trends (sector scope)',
      drillBack: 'Back to sector overview',
    },
    district: {
      headerTitle: 'District overview',
      heroTitle: 'District ECD performance',
      heroSubtitle:
        'Filter by time, age, and sex to see how many children are reached and where centres cluster on the map for targeted support.',
      heroClass: 'border-sky-200/80 bg-gradient-to-br from-surface-card to-surface-mint/20',
      layout: 'broad',
      statusChartTitle: 'Nutritional status (district)',
      trendsChartTitle: 'Alert trends (district scope)',
      drillBack: 'Back to district map',
    },
    national: {
      headerTitle: 'National picture',
      heroTitle: 'National ECD monitoring',
      heroSubtitle:
        'Aggregate view across Rwanda for planning, standards compliance, and reporting aligned with the national ECD policy MIS goals.',
      heroClass: 'border-ink-muted/30 bg-gradient-to-br from-surface-card to-canvas',
      layout: 'broad',
      statusChartTitle: 'Nutritional status (national)',
      trendsChartTitle: 'Alert trends (national scope)',
      drillBack: 'Back to national overview',
    },
    sys_admin: {
      headerTitle: 'System administration',
      heroTitle: 'Platform health & data',
      heroSubtitle:
        'Same aggregates as national view, with emphasis on operational monitoring across all centres in the Irerero deployment.',
      heroClass: 'border-slate-300/80 bg-gradient-to-br from-surface-card to-surface-mint/15',
      layout: 'broad',
      statusChartTitle: 'Nutritional status (all centres)',
      trendsChartTitle: 'Alert trends (system-wide)',
      drillBack: 'Back to overview',
    },
    partner: {
      headerTitle: 'Partner analytics',
      heroTitle: 'Anonymised programme view',
      heroSubtitle:
        'High-level indicators suitable for development partners: totals and trends without identifiable child data in exports you use.',
      heroClass: 'border-forest/20 bg-gradient-to-br from-surface-mint/30 to-surface-card',
      layout: 'broad',
      statusChartTitle: 'Nutritional status (aggregated, anonymised where applicable)',
      trendsChartTitle: 'Alert trends (aggregated)',
      drillBack: 'Back to overview',
    },
  }
  return M[role] || M.caregiver
}

function severityBadge(sev) {
  if (sev === 'urgent' || sev === 'red')
    return 'bg-surface-blush text-coral border border-coral/25'
  if (sev === 'warning' || sev === 'yellow')
    return 'bg-amber-50 text-amber-900 border border-amber-200/80'
  return 'bg-surface-mint/90 text-forest border border-sage/35'
}

/** Short description of broad-dashboard filters for the stat strip. */
function humanizeBroadFilters(filters) {
  const parts = []
  if (filters.period === 'this_month') parts.push('Enrolled since start of this month')
  else if (filters.period === 'last_3_months') parts.push('Enrolled in the last ~3 months')
  else if (filters.period === 'this_year') parts.push('Enrolled since 1 Jan this year')
  if (filters.ageGroup === '0-2') parts.push('Age about 0–24 months')
  else if (filters.ageGroup === '3-6') parts.push('Age about 3–6 years')
  if (filters.sex === 'male') parts.push('Boys only')
  else if (filters.sex === 'female') parts.push('Girls only')
  return parts.length ? parts.join(' · ') : 'All active enrolments (no demographic slice)'
}

/** Maps UI filter state to GET query params for district/national dashboards (FR-066). */
function buildDistrictNationalParams(filters) {
  const params = {}
  if (filters.period && filters.period !== 'all') params.period = filters.period
  if (filters.sex === 'male' || filters.sex === 'female') params.sex = filters.sex
  if (filters.ageGroup === '0-2') {
    params.age_max_months = 24
  } else if (filters.ageGroup === '3-6') {
    params.age_min_months = 36
    params.age_max_months = 72
  }
  return params
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const role = user?.role || 'caregiver'
  const meta = metaForRole(role)

  const [drilledCentre, setDrilledCentre] = useState(null)
  const [filters, setFilters] = useState({ period: 'all', ageGroup: 'all', sex: 'all' })

  const queryFn =
    {
      caregiver: dashboardApi.caregiver,
      chw: dashboardApi.caregiver,
      centre_mgr: dashboardApi.centre,
      sector: dashboardApi.sector,
      district: dashboardApi.district,
      national: dashboardApi.national,
      sys_admin: dashboardApi.national,
      partner: dashboardApi.national,
    }[role] || dashboardApi.caregiver

  const isBroadApi = ['district', 'national', 'sys_admin', 'partner'].includes(role)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', role, filters],
    queryFn: () => (isBroadApi ? queryFn(buildDistrictNationalParams(filters)) : queryFn({})),
    enabled: !!user,
  })

  const d = data?.data || data || {}
  const layout = meta.layout
  const showBroadFilters = ['district', 'national', 'sys_admin', 'partner'].includes(role)
  const showMap = showBroadFilters && d.centres?.length
  const showSms = layout === 'frontline' || layout === 'centre' || layout === 'broad'

  if (drilledCentre) {
    return (
      <div className="flex-1 overflow-auto min-h-0 bg-canvas">
        <Header title={`Centre — ${drilledCentre.centre_name}`} />
        <div className="p-6 md:p-8 space-y-8">
          <button
            type="button"
            onClick={() => setDrilledCentre(null)}
            className="flex items-center gap-2 text-sm font-semibold text-forest hover:text-coral transition-colors duration-200"
          >
            &larr; {meta.drillBack}
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total enrolled" value={drilledCentre.total_enrolled} variant="sky" />
            <StatCard label="SAM %" value={`${drilledCentre.sam_percent}%`} variant="rose" />
            <StatCard label="Stunted %" value={drilledCentre.stunted_percent != null ? `${drilledCentre.stunted_percent}%` : '—'} variant="amber" />
            <StatCard label="Unresolved alerts" value={drilledCentre.unresolved_alerts ?? '—'} variant="slate" />
          </div>
          <div className="card p-8 text-center">
            <h3 className="text-xl font-bold text-ink-display font-display tracking-wide mb-2">Centre drill-down</h3>
            <p className="text-ink-muted leading-relaxed">
              Summary for {drilledCentre.centre_name}. Use the Children and Alerts pages for child-level detail.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hero = (
    <div className={`rounded-2xl border-[1.5px] p-6 md:p-7 ${meta.heroClass}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-forest/80 mb-2">{meta.headerTitle}</p>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-ink-display tracking-tight mb-2">{meta.heroTitle}</h2>
      <p className="text-sm md:text-base text-ink-muted max-w-3xl leading-relaxed">{meta.heroSubtitle}</p>
    </div>
  )

  const frontlineDuePanel =
    layout === 'frontline' &&
    (d.due_or_overdue?.length > 0 || (d.active_alerts && d.active_alerts.length > 0)) ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d.due_or_overdue?.length > 0 && (
          <div className="card p-6 border-l-4 border-l-amber">
            <h3 className="font-display font-bold text-ink-display tracking-wide mb-1">Measurements due or overdue</h3>
            <p className="text-xs text-ink-muted mb-4 leading-relaxed">
              Children who have never been measured or whose last measurement was more than 30 days ago (per Irerero FR-061).
            </p>
            <ul className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
              {d.due_or_overdue.map(row => (
                <li key={row.child_id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                  <Link to="/children" className="font-semibold text-forest hover:text-coral text-sm">
                    {row.name}
                  </Link>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {row.reason === 'never_measured'
                      ? 'Never measured'
                      : row.days_since != null
                        ? `${row.days_since} days since last measure`
                        : row.reason}
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/children" className="inline-block mt-4 text-sm font-semibold text-forest hover:text-coral">
              Open children list →
            </Link>
          </div>
        )}
        {d.active_alerts?.length > 0 && (
          <div className="card p-6 border-l-4 border-l-coral">
            <h3 className="font-display font-bold text-ink-display tracking-wide mb-1">Active alerts (priority)</h3>
            <p className="text-xs text-ink-muted mb-4 leading-relaxed">Newest urgent and warning alerts for your centre.</p>
            <ul className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
              {d.active_alerts.slice(0, 8).map(a => (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${severityBadge(a.severity)}`}>
                      {a.severity_display || a.severity}
                    </span>
                    <span className="font-semibold text-ink text-sm">{a.child_name}</span>
                  </div>
                  {a.explanation_en && <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{a.explanation_en}</p>}
                </li>
              ))}
            </ul>
            <Link to="/alerts" className="inline-block mt-4 text-sm font-semibold text-forest hover:text-coral">
              View all alerts →
            </Link>
          </div>
        )}
      </div>
    ) : null

  const centreRankedPanel =
    layout === 'centre' && d.ranked_urgent_children?.length > 0 ? (
      <div className="card p-6 border-l-4 border-l-coral">
        <h3 className="font-display text-lg font-bold text-ink-display tracking-wide mb-1">Most urgent children</h3>
        <p className="text-sm text-ink-muted mb-4 leading-relaxed">
          Ranked by alert severity and time — address these first before monthly reporting (FR-063).
        </p>
        <div className="table-wrap">
          <table className="w-full text-sm table-standard">
            <thead>
              <tr>
                <th className="px-4 py-3.5">Child</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Summary</th>
              </tr>
            </thead>
            <tbody className="bg-surface-card">
              {d.ranked_urgent_children.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-semibold text-ink">{a.child_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${severityBadge(a.severity)}`}>
                      {a.severity_display || a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs max-w-md">
                    {a.explanation_en ? <span className="line-clamp-2">{a.explanation_en}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/alerts" className="inline-block mt-4 text-sm font-semibold text-forest hover:text-coral">
          Manage alerts →
        </Link>
      </div>
    ) : null

  const quickActions =
    layout === 'frontline' && d.quick_actions?.length > 0 ? (
      <div className="flex flex-wrap gap-3">
        {d.quick_actions.includes('take_attendance') && (
          <Link to="/children" className="btn-primary text-sm">
            Take attendance
          </Link>
        )}
        {d.quick_actions.includes('record_measurement') && (
          <Link to="/children" className="btn-secondary text-sm">
            Record measurement
          </Link>
        )}
        {d.quick_actions.includes('view_alerts') && (
          <Link to="/alerts" className="btn-secondary text-sm">
            View alerts
          </Link>
        )}
      </div>
    ) : null

  const statRow = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {layout === 'frontline' && d.attendance && (
        <>
          <StatCard label="Present today" value={d.attendance?.present || 0} variant="emerald" sub={d.attendance?.date ? `Date: ${d.attendance.date}` : null} />
          <StatCard label="Absent today" value={d.attendance?.absent || 0} variant="rose" />
          <StatCard label="Active alerts" value={d.active_alerts?.length ?? 0} variant="amber" sub="Shown in priority list" />
          <StatCard label="Due / overdue measures" value={d.due_or_overdue?.length ?? 0} variant="sky" sub="≥30 days or never measured" />
        </>
      )}
      {layout === 'centre' && (
        <>
          {d.total_enrolled != null && <StatCard label="Total enrolled" value={d.total_enrolled} variant="sky" />}
          {d.unresolved_alerts != null && <StatCard label="Unresolved alerts" value={d.unresolved_alerts} variant="amber" />}
          <StatCard label="Urgent queue" value={d.ranked_urgent_children?.length ?? 0} variant="rose" sub="Top ranked active alerts" />
          <StatCard label="Statuses tracked" value={d.status_distribution ? Object.keys(d.status_distribution).length : '—'} variant="slate" sub="Categories in latest measurements" />
        </>
      )}
      {layout === 'sector' && (
        <>
          {d.total_centres != null && <StatCard label="ECD centres" value={d.total_centres} variant="sky" />}
          <StatCard
            label="Children (sector est.)"
            value={d.centres?.reduce((s, c) => s + (c.total_enrolled || 0), 0) ?? '—'}
            variant="emerald"
            sub="Sum of enrolled from centre rows"
          />
          <StatCard
            label="Open alerts (est.)"
            value={d.centres?.reduce((s, c) => s + (c.unresolved_alerts || 0), 0) ?? '—'}
            variant="amber"
          />
          <StatCard
            label="Highest SAM %"
            value={d.centres?.length ? `${Math.max(...d.centres.map(c => Number(c.sam_percent) || 0))}%` : '—'}
            variant="rose"
            sub="Across centres in this load"
          />
        </>
      )}
      {layout === 'broad' && (
        <>
          {d.total_centres != null && <StatCard label="Centres" value={d.total_centres} variant="sky" />}
          {d.total_children != null && <StatCard label="Children (filtered)" value={d.total_children} variant="emerald" />}
          {d.unresolved_alerts != null ? (
            <StatCard label="Unresolved alerts" value={d.unresolved_alerts} variant="amber" />
          ) : (
            <StatCard
              label="Cohort"
              value={filters.period === 'all' && filters.ageGroup === 'all' && filters.sex === 'all' ? 'All' : 'Filtered'}
              variant="slate"
              sub={humanizeBroadFilters(filters)}
            />
          )}
        </>
      )}
    </div>
  )

  // Frontline dashboard stays operational (no aggregate charts). Other roles see trends + optional status mix.
  const chartsRow =
    layout === 'frontline' ? null : (
      <div className={`grid grid-cols-1 gap-4 mt-2 ${d.status_distribution ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {d.status_distribution && <StatusDistributionChart data={d.status_distribution} title={meta.statusChartTitle} />}
        <AlertTrendsChart title={meta.trendsChartTitle} />
      </div>
    )

  const centresTable = d.centres ? (
    <div className="card p-6">
      <h3 className="font-display text-lg font-bold text-ink-display tracking-wide mb-1">
        {layout === 'sector' ? 'Centres ranked by SAM burden' : 'Centres overview'}
      </h3>
      {layout === 'sector' && (
        <p className="text-sm text-ink-muted mb-4 leading-relaxed">Highest SAM % first — use this to plan supervision visits (FR-065).</p>
      )}
      <div className="table-wrap">
        <table className="w-full text-sm table-standard">
          <thead>
            <tr>
              <th className="px-4 py-3.5">Centre</th>
              <th className="px-4 py-3.5 text-center">Enrolled</th>
              <th className="px-4 py-3.5 text-center">SAM %</th>
              <th className="px-4 py-3.5 text-center">Stunted %</th>
              <th className="px-4 py-3.5 text-center">Alerts</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="bg-surface-card">
            {d.centres.map(c => (
              <tr
                key={c.centre_id}
                onClick={() => {
                  if (layout === 'sector') setDrilledCentre(c)
                }}
                className={layout === 'sector' ? 'cursor-pointer group' : ''}
              >
                <td className="px-4 py-3 font-semibold text-ink">{c.centre_name}</td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-muted">{c.total_enrolled}</td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <span
                    className={`font-semibold px-2.5 py-1 rounded-lg text-xs ${
                      c.sam_percent > 5 ? 'bg-surface-blush text-coral border border-coral/20' : 'bg-surface-mint/80 text-forest border border-sage/30'
                    }`}
                  >
                    {c.sam_percent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-ink-muted">{c.stunted_percent != null ? `${c.stunted_percent}%` : '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.unresolved_alerts == null ? (
                    <span className="text-ink-muted text-xs">—</span>
                  ) : c.unresolved_alerts > 0 ? (
                    <span className="inline-flex justify-center rounded-lg bg-surface-blush text-coral px-2.5 py-0.5 text-xs font-semibold border border-coral/20">
                      {c.unresolved_alerts}
                    </span>
                  ) : (
                    <span className="text-sage text-xs font-semibold">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {layout === 'sector' ? (
                    <button type="button" className="text-xs font-semibold text-forest group-hover:text-coral transition-colors duration-200">
                      View →
                    </button>
                  ) : (
                    <span className="text-ink-muted text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null

  const mapBlock =
    showMap && d.centres ? (
      <div className="card p-6">
        <h3 className="font-display text-lg font-bold text-ink-display tracking-wide mb-1">Geographic overview</h3>
        <p className="text-sm text-ink-muted mb-4 leading-relaxed">Circle size reflects SAM %; colour highlights centres above 5% SAM.</p>
        <div className="h-96 w-full rounded-2xl overflow-hidden border border-border-subtle z-0 relative">
          <MapContainer center={[-1.9403, 29.8739]} zoom={8} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap" />
            {d.centres.map(c => (
              <CircleMarker
                key={c.centre_id}
                center={[c.gps_latitude || -1.9403, c.gps_longitude || 29.8739]}
                radius={Math.max(5, c.sam_percent)}
                pathOptions={{
                  fillColor: c.sam_percent > 5 ? '#E8573A' : '#3DAF8A',
                  color: '#FDF6EE',
                  weight: 2,
                  fillOpacity: 0.85,
                }}
              >
                <Popup>
                  <strong>{c.centre_name}</strong>
                  <br />
                  Enrolled: {c.total_enrolled}
                  <br />
                  SAM: {c.sam_percent}%
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    ) : null

  const alertsSmsBlock =
    layout === 'sector' ? (
      <div className="mt-6">
        <AlertsPanel compact={false} />
      </div>
    ) : showSms ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <AlertsPanel compact={layout === 'frontline'} />
        <SmsInbox />
      </div>
    ) : (
      <div className="mt-6">
        <AlertsPanel compact />
      </div>
    )

  const mainFlow = (
    <>
      {hero}

      {layout === 'frontline' && quickActions && <div className="flex flex-wrap gap-3 pt-2">{quickActions}</div>}

      {statRow}

      {layout === 'frontline' && frontlineDuePanel}

      {layout === 'centre' && centreRankedPanel}

      {layout === 'centre' && chartsRow}

      {layout === 'sector' && (
        <>
          {centresTable}
          {chartsRow}
        </>
      )}

      {layout === 'broad' && (
        <>
          {chartsRow}
          {centresTable}
          {mapBlock}
        </>
      )}

      {layout === 'centre' && alertsSmsBlock}
      {layout === 'sector' && alertsSmsBlock}
      {layout === 'broad' && alertsSmsBlock}
    </>
  )

  return (
    <div className="flex-1 overflow-auto min-h-0 bg-canvas">
      <Header title={`${meta.headerTitle} — ${user?.full_name || '…'}`} />

      <div className="p-6 md:p-8 space-y-8 max-w-[1600px]">
        {showBroadFilters && (
          <div className="card p-6 border-surface-mint/50 bg-surface-mint/30 space-y-3">
            <div className="flex flex-wrap gap-5 items-end">
              <div>
                <label className="field-label mb-2">Enrolment period</label>
                <select
                  value={filters.period}
                  onChange={e => setFilters({ ...filters, period: e.target.value })}
                  className="input-field w-auto min-w-[11rem]"
                >
                  <option value="all">All periods</option>
                  <option value="this_month">This month</option>
                  <option value="last_3_months">Last 3 months</option>
                  <option value="this_year">This year</option>
                </select>
              </div>
              <div>
                <label className="field-label mb-2">Age group</label>
                <select
                  value={filters.ageGroup}
                  onChange={e => setFilters({ ...filters, ageGroup: e.target.value })}
                  className="input-field w-auto min-w-[10rem]"
                >
                  <option value="all">All ages (0–8 yrs)</option>
                  <option value="0-2">Infant (0–2 yrs)</option>
                  <option value="3-6">Pre-school (3–6 yrs)</option>
                </select>
              </div>
              <div>
                <label className="field-label mb-2">Gender</label>
                <select value={filters.sex} onChange={e => setFilters({ ...filters, sex: e.target.value })} className="input-field w-auto min-w-[8rem]">
                  <option value="all">All</option>
                  <option value="male">Boys</option>
                  <option value="female">Girls</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed max-w-4xl">
              Results update automatically. Enrolment period limits to children whose <strong>enrolment date</strong> falls in the window; age and gender apply to the active child list used for counts and SAM % by centre (FR-066).
            </p>
          </div>
        )}

        {!user ? (
          <div className="flex items-center justify-center h-48 text-ink-muted text-sm font-medium">Loading your profile…</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48 text-ink-muted text-sm font-medium">Loading dashboard…</div>
        ) : isError ? (
          <div className="rounded-2xl border-[1.5px] border-coral bg-surface-blush p-6 text-ink">
            <p className="font-semibold font-display text-ink-display tracking-wide">Could not load dashboard</p>
            <p className="text-sm mt-2 text-ink-muted leading-relaxed">{error?.response?.data?.detail || error.message}</p>
          </div>
        ) : (
          mainFlow
        )}
      </div>
    </div>
  )
}
