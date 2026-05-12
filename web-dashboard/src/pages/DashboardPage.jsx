// src/pages/DashboardPage.jsx 
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const role = user?.role || 'caregiver'

  const [drilledCentre, setDrilledCentre] = useState(null)
  const [filters, setFilters] = useState({ period: 'this_month', ageGroup: 'all', sex: 'all' })

  const queryFn = {
      caregiver: dashboardApi.caregiver,
      chw: dashboardApi.caregiver,
      centre_mgr: dashboardApi.centre,
      sector: dashboardApi.sector,
      district: dashboardApi.district,
      national: dashboardApi.national,
      sys_admin: dashboardApi.national,
      partner: dashboardApi.national,
    }[role] || dashboardApi.caregiver

  // Added filters to queryKey and passed to queryFn
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', role, filters],
    queryFn: () => queryFn(filters),
    enabled: !!user,
  })
  
  const d = data?.data || data || {}

  if (drilledCentre) {
    return (
      <div className="flex-1 overflow-auto min-h-0 bg-canvas">
        <Header title={`Centre Details — ${drilledCentre.centre_name}`} />
        <div className="p-6 md:p-8 space-y-8">
          <button onClick={() => setDrilledCentre(null)} className="flex items-center gap-2 text-sm font-semibold text-forest hover:text-coral transition-colors duration-200">
            &larr; Back to Sector Overview
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total enrolled" value={drilledCentre.total_enrolled} variant="sky" />
            <StatCard label="SAM %" value={`${drilledCentre.sam_percent}%`} variant="rose" />
            <StatCard label="Stunted %" value={`${drilledCentre.stunted_percent}%`} variant="amber" />
            <StatCard label="Unresolved alerts" value={drilledCentre.unresolved_alerts} variant="slate" />
          </div>
          <div className="card p-8 text-center">
            <h3 className="text-xl font-bold text-ink-display font-display tracking-wide mb-2">Centre Drill-Down View</h3>
            <p className="text-ink-muted leading-relaxed">Detailed child-level metrics for {drilledCentre.centre_name} are aggregated here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto min-h-0 bg-canvas">
      <Header title={`Dashboard — ${user?.full_name || '…'}`} />
      <div className="p-6 md:p-8 space-y-8 max-w-[1600px]">
        
        {['district', 'national', 'sys_admin', 'partner'].includes(role) && (
          <div className="card p-6 flex flex-wrap gap-5 items-end border-surface-mint/50 bg-surface-mint/30">
            <div>
              <label className="field-label mb-2">Time Period</label>
              <select value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})} className="input-field w-auto min-w-[10rem]">
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="this_year">This Year</option>
              </select>
            </div>
            <div>
              <label className="field-label mb-2">Age Group</label>
              <select value={filters.ageGroup} onChange={e => setFilters({...filters, ageGroup: e.target.value})} className="input-field w-auto min-w-[10rem]">
                <option value="all">All Ages (0-8 yrs)</option>
                <option value="0-2">Infant (0-2 yrs)</option>
                <option value="3-6">Pre-school (3-6 yrs)</option>
              </select>
            </div>
            <div>
              <label className="field-label mb-2">Gender</label>
              <select value={filters.sex} onChange={e => setFilters({...filters, sex: e.target.value})} className="input-field w-auto min-w-[8rem]">
                <option value="all">All</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
              </select>
            </div>
            <button type="button" onClick={() => refetch()} className="btn-primary">
              Apply filters
            </button>
          </div>
        )}

        {!user ? <div className="flex items-center justify-center h-48 text-ink-muted text-sm font-medium">Loading your profile…</div>
        : isLoading ? <div className="flex items-center justify-center h-48 text-ink-muted text-sm font-medium">Loading dashboard…</div>
        : isError ? (
          <div className="rounded-2xl border-[1.5px] border-coral bg-surface-blush p-6 text-ink">
            <p className="font-semibold font-display text-ink-display tracking-wide">Could not load dashboard</p>
            <p className="text-sm mt-2 text-ink-muted leading-relaxed">{error?.response?.data?.detail || error.message}</p>
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
              {d.total_enrolled != null && <StatCard label="Total enrolled" value={d.total_enrolled} variant="sky" />}
              {d.unresolved_alerts != null && <StatCard label="Unresolved alerts" value={d.unresolved_alerts} variant="amber" />}
              {d.total_centres != null && <StatCard label="Centres" value={d.total_centres} variant="slate" />}
              {d.total_children != null && <StatCard label="Total children" value={d.total_children} variant="sky" />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {d.status_distribution && <StatusDistributionChart data={d.status_distribution} />}
              <AlertTrendsChart />
            </div>

            {d.centres && (
              <div className="card p-6 mt-6">
                <h3 className="font-display text-lg font-bold text-ink-display tracking-wide mb-4">Centres overview</h3>
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
                      {d.centres.map((c, i) => (
                        <tr key={c.centre_id} onClick={() => setDrilledCentre(c)} className="cursor-pointer group">
                          <td className="px-4 py-3 font-semibold text-ink">{c.centre_name}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-ink-muted">{c.total_enrolled}</td>
                          <td className="px-4 py-3 text-center tabular-nums"><span className={`font-semibold px-2.5 py-1 rounded-lg text-xs ${c.sam_percent > 5 ? 'bg-surface-blush text-coral border border-coral/20' : 'bg-surface-mint/80 text-forest border border-sage/30'}`}>{c.sam_percent}%</span></td>
                          <td className="px-4 py-3 text-center tabular-nums text-ink-muted">{c.stunted_percent}%</td>
                          <td className="px-4 py-3 text-center">{c.unresolved_alerts > 0 ? <span className="inline-flex justify-center rounded-lg bg-surface-blush text-coral px-2.5 py-0.5 text-xs font-semibold border border-coral/20">{c.unresolved_alerts}</span> : <span className="text-sage text-xs font-semibold">None</span>}</td>
                          <td className="px-4 py-3 text-right"><button type="button" className="text-xs font-semibold text-forest group-hover:text-coral transition-colors duration-200">View →</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {['district', 'national', 'sys_admin', 'partner'].includes(role) && d.centres && (
              <div className="card p-6 mt-6">
                <h3 className="font-display text-lg font-bold text-ink-display tracking-wide mb-4">Geographic Hotspot Map</h3>
                <div className="h-96 w-full rounded-2xl overflow-hidden border border-border-subtle z-0 relative">
                  <MapContainer center={[-1.9403, 29.8739]} zoom={8} scrollWheelZoom={false} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                    {d.centres.map(c => (
                       <CircleMarker key={c.centre_id} center={[c.gps_latitude || -1.9403, c.gps_longitude || 29.8739]} radius={Math.max(5, c.sam_percent)} pathOptions={{ fillColor: c.sam_percent > 5 ? '#E8573A' : '#3DAF8A', color: '#FDF6EE', weight: 2, fillOpacity: 0.85 }}>
                         <Popup><strong>{c.centre_name}</strong><br/>Enrolled: {c.total_enrolled}<br/>SAM: {c.sam_percent}%</Popup>
                       </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <AlertsPanel compact />
              <SmsInbox />
            </div>
          </>
        )}
      </div>
    </div>
  )
}