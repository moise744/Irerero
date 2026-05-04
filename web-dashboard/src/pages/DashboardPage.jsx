// src/pages/DashboardPage.jsx 
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { useAuthStore } from '../hooks/useAuth'
import AlertsPanel from '../components/alerts/AlertsPanel'
import SmsInbox from '../components/sms/SmsInbox'
import StatusDistributionChart from '../components/dashboard/StatusDistributionChart'
import Header from '../components/layout/Header'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet' 

const bar = { emerald: 'border-l-emerald-600', rose: 'border-l-rose-600', sky: 'border-l-sky-700', amber: 'border-l-amber-600', slate: 'border-l-slate-600' }

function StatCard({ label, value, sub, variant = 'slate' }) {
  return (
    <div className={`rounded-lg border border-stone-200/90 bg-white pl-4 pr-4 py-4 shadow-sm border-l-[3px] ${bar[variant]}`}>
      <div className="text-2xl font-semibold tabular-nums text-stone-900 tracking-tight">{value}</div>
      <div className="text-sm font-medium text-stone-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
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
      <div className="flex-1 overflow-auto min-h-0 bg-stone-50">
        <Header title={`Centre Details — ${drilledCentre.centre_name}`} />
        <div className="p-6 space-y-6">
          <button onClick={() => setDrilledCentre(null)} className="flex items-center gap-2 text-sm font-semibold text-[#0f2d26] hover:underline">
            &larr; Back to Sector Overview
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total enrolled" value={drilledCentre.total_enrolled} variant="sky" />
            <StatCard label="SAM %" value={`${drilledCentre.sam_percent}%`} variant="rose" />
            <StatCard label="Stunted %" value={`${drilledCentre.stunted_percent}%`} variant="amber" />
            <StatCard label="Unresolved alerts" value={drilledCentre.unresolved_alerts} variant="slate" />
          </div>
          <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-8 text-center">
            <h3 className="text-lg font-bold text-stone-800 mb-2">Centre Drill-Down View</h3>
            <p className="text-stone-500">Detailed child-level metrics for {drilledCentre.centre_name} are aggregated here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <Header title={`Dashboard — ${user?.full_name || '…'}`} />
      <div className="p-6 space-y-6">
        
        {['district', 'national', 'sys_admin', 'partner'].includes(role) && (
          <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 uppercase">Time Period</label>
              <select value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})} className="border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-stone-50">
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="this_year">This Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 uppercase">Age Group</label>
              <select value={filters.ageGroup} onChange={e => setFilters({...filters, ageGroup: e.target.value})} className="border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-stone-50">
                <option value="all">All Ages (0-8 yrs)</option>
                <option value="0-2">Infant (0-2 yrs)</option>
                <option value="3-6">Pre-school (3-6 yrs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1 uppercase">Gender</label>
              <select value={filters.sex} onChange={e => setFilters({...filters, sex: e.target.value})} className="border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-stone-50">
                <option value="all">All</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
              </select>
            </div>
            <button onClick={() => refetch()} className="px-4 py-1.5 bg-[#0f2d26] text-white text-sm font-semibold rounded-md hover:bg-[#163d34] shadow-sm">
              Apply Filters
            </button>
          </div>
        )}

        {!user ? <div className="flex items-center justify-center h-48 text-stone-400 text-sm">Loading your profile…</div>
        : isLoading ? <div className="flex items-center justify-center h-48 text-stone-400 text-sm">Loading dashboard…</div>
        : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
            <p className="font-semibold font-display">Could not load dashboard</p>
            <p className="text-sm mt-2 opacity-90">{error?.response?.data?.detail || error.message}</p>
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

            {d.status_distribution && <StatusDistributionChart data={d.status_distribution} />}

            {d.centres && (
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
                <h3 className="font-display font-semibold text-stone-900 mb-4">Centres overview</h3>
                <div className="overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 text-left text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium">Centre</th>
                        <th className="px-4 py-3 font-medium text-center">Enrolled</th>
                        <th className="px-4 py-3 font-medium text-center">SAM %</th>
                        <th className="px-4 py-3 font-medium text-center">Stunted %</th>
                        <th className="px-4 py-3 font-medium text-center">Alerts</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.centres.map((c, i) => (
                        <tr key={c.centre_id} onClick={() => setDrilledCentre(c)} className={`${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/80'} hover:bg-teal-50 cursor-pointer transition-colors`}>
                          <td className="px-4 py-2.5 font-medium text-stone-800">{c.centre_name}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums">{c.total_enrolled}</td>
                          <td className="px-4 py-2.5 text-center tabular-nums"><span className={`font-semibold ${c.sam_percent > 5 ? 'text-red-700' : 'text-emerald-700'}`}>{c.sam_percent}%</span></td>
                          <td className="px-4 py-2.5 text-center tabular-nums text-stone-700">{c.stunted_percent}%</td>
                          <td className="px-4 py-2.5 text-center">{c.unresolved_alerts > 0 ? <span className="inline-flex justify-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold">{c.unresolved_alerts}</span> : <span className="text-emerald-700 text-xs font-medium">None</span>}</td>
                          <td className="px-4 py-2.5 text-right"><button className="text-xs font-bold text-teal-700 hover:underline">View &rarr;</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {['district', 'national', 'sys_admin', 'partner'].includes(role) && d.centres && (
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5 mt-6">
                <h3 className="font-display font-semibold text-stone-900 mb-4">Geographic Hotspot Map</h3>
                <div className="h-96 w-full rounded-lg overflow-hidden border border-stone-200 z-0 relative">
                  <MapContainer center={[-1.9403, 29.8739]} zoom={8} scrollWheelZoom={false} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                    {d.centres.map(c => (
                       <CircleMarker key={c.centre_id} center={[c.gps_latitude || -1.9403, c.gps_longitude || 29.8739]} radius={Math.max(5, c.sam_percent)} pathOptions={{ fillColor: c.sam_percent > 5 ? '#ef4444' : '#22c55e', color: 'white', weight: 1, fillOpacity: 0.7 }}>
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