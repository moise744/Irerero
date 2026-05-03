// src/pages/DashboardPage.jsx — dynamic dashboard based on user role — FR-061 to FR-068
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { useAuthStore } from '../hooks/useAuth'
import AlertsPanel from '../components/alerts/AlertsPanel'
import SmsInbox from '../components/sms/SmsInbox'
import StatusDistributionChart from '../components/dashboard/StatusDistributionChart'
import Header from '../components/layout/Header'

const bar = {
  emerald: 'border-l-emerald-600',
  rose: 'border-l-rose-600',
  sky: 'border-l-sky-700',
  amber: 'border-l-amber-600',
  slate: 'border-l-slate-600',
}

function StatCard({ label, value, sub, variant = 'slate' }) {
  return (
    <div
      className={`rounded-lg border border-stone-200/90 bg-white pl-4 pr-4 py-4 shadow-sm border-l-[3px] ${bar[variant]}`}
    >
      <div className="text-2xl font-semibold tabular-nums text-stone-900 tracking-tight">{value}</div>
      <div className="text-sm font-medium text-stone-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)

  const role = user?.role || 'caregiver'

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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', role],
    queryFn,
    enabled: !!user,
  })
  const d = data?.data || data || {}

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <Header title={`Dashboard — ${user?.full_name || '…'}`} />
      <div className="p-6 space-y-6">
        {!user ? (
          <div className="flex items-center justify-center h-48 text-stone-400 text-sm">Loading your profile…</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48 text-stone-400 text-sm">Loading dashboard…</div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
            <p className="font-semibold font-display">Could not load dashboard</p>
            <p className="text-sm mt-2 opacity-90">{error?.response?.data?.detail || error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-[#0f2d26] text-white text-sm rounded-lg hover:bg-[#163d34]"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {d.attendance && (
                <>
                  <StatCard label="Present today" value={d.attendance?.present || 0} variant="emerald" />
                  <StatCard label="Absent today" value={d.attendance?.absent || 0} variant="rose" />
                </>
              )}
              {d.total_enrolled != null && (
                <StatCard label="Total enrolled" value={d.total_enrolled} variant="sky" />
              )}
              {d.unresolved_alerts != null && (
                <StatCard label="Unresolved alerts" value={d.unresolved_alerts} variant="amber" />
              )}
              {d.total_centres != null && <StatCard label="Centres" value={d.total_centres} variant="slate" />}
              {d.total_children != null && (
                <StatCard label="Total children" value={d.total_children} variant="sky" />
              )}
            </div>

            {d.status_distribution && <StatusDistributionChart data={d.status_distribution} />}

            {d.centres && (
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
                <h3 className="font-display font-semibold text-stone-900 mb-4">Centres overview</h3>
                <p className="text-xs text-stone-500 -mt-2 mb-4">Sorted by urgency</p>
                <div className="overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 text-left text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium">Centre</th>
                        <th className="px-4 py-3 font-medium text-center">Enrolled</th>
                        <th className="px-4 py-3 font-medium text-center">SAM %</th>
                        <th className="px-4 py-3 font-medium text-center">Stunted %</th>
                        <th className="px-4 py-3 font-medium text-center">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.centres.map((c, i) => (
                        <tr key={c.centre_id} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/80'}>
                          <td className="px-4 py-2.5 font-medium text-stone-800">{c.centre_name}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums">{c.total_enrolled}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums">
                            <span
                              className={`font-semibold ${
                                c.sam_percent > 10
                                  ? 'text-red-700'
                                  : c.sam_percent > 5
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {c.sam_percent}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center tabular-nums text-stone-700">
                            {c.stunted_percent}%
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {c.unresolved_alerts > 0 ? (
                              <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold tabular-nums">
                                {c.unresolved_alerts}
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-xs font-medium">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {d.due_or_overdue?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
                <h3 className="font-display font-semibold text-stone-900 mb-1">
                  Due or overdue for measurement
                </h3>
                <p className="text-xs text-stone-500 mb-4">{d.due_or_overdue.length} children</p>
                <div className="space-y-2">
                  {d.due_or_overdue.slice(0, 8).map(c => (
                    <div
                      key={c.child_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200/80 bg-amber-50/50"
                    >
                      <span className="font-medium text-stone-800">{c.name}</span>
                      <span className="text-xs text-amber-900/80 font-medium shrink-0">
                        {c.days_since != null
                          ? `${c.days_since} days since last measurement`
                          : 'Never measured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AlertsPanel compact />
              <SmsInbox />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
