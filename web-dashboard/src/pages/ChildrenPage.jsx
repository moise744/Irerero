// src/pages/ChildrenPage.jsx — FR-015 searchable child register with 7 profile tabs
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenApi, alertsApi } from '../services/api'
import StatusBadge from '../components/layout/StatusBadge'
import Header from '../components/layout/Header'
import GrowthChart from '../components/charts/GrowthChart'

function MeasurementsTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-measurements', childId],
    queryFn: () => childrenApi.measurements(childId).then(r => r.data.results || r.data || []),
  })
  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading measurements…</div>
  const measurements = data || []
  if (!measurements.length) return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">No measurements recorded yet.</div>
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-stone-100 text-stone-700 text-xs uppercase tracking-wide">
          <th className="px-4 py-3 text-left">Date</th>
          <th className="px-4 py-3 text-center">Weight (kg)</th>
          <th className="px-4 py-3 text-center">Height (cm)</th>
          <th className="px-4 py-3 text-center">MUAC (cm)</th>
          <th className="px-4 py-3 text-center">Temp (°C)</th>
          <th className="px-4 py-3 text-center">WAZ</th>
          <th className="px-4 py-3 text-center">HAZ</th>
          <th className="px-4 py-3 text-center">WHZ</th>
          <th className="px-4 py-3 text-center">Status</th>
          <th className="px-4 py-3 text-center">Source</th>
        </tr></thead>
        <tbody>{measurements.map((m, i) => (
          <tr key={m.id} className={`${i % 2 === 0 ? 'bg-gray-50' : ''} ${m.biv_flagged ? 'bg-yellow-50' : ''}`}>
            <td className="px-4 py-2">{new Date(m.recorded_at).toLocaleDateString()}</td>
            <td className="px-4 py-2 text-center">{m.weight_kg || '—'}</td>
            <td className="px-4 py-2 text-center">{m.height_cm || '—'}</td>
            <td className="px-4 py-2 text-center">{m.muac_cm || '—'}</td>
            <td className="px-4 py-2 text-center">{m.temperature_c || '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.waz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.haz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.whz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center"><StatusBadge status={m.nutritional_status} /></td>
            <td className="px-4 py-2 text-center text-xs text-gray-500">{m.source}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function AlertsTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-alerts', childId],
    queryFn: () => childrenApi.alerts(childId).then(r => r.data.results || r.data || []),
  })
  const qc = useQueryClient()
  const actionMutation = useMutation({
    mutationFn: ({ id, text }) => alertsApi.action(id, text),
    onSuccess: () => qc.invalidateQueries(['child-alerts', childId]),
  })
  const [actionText, setActionText] = useState({})

  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading alerts…</div>
  const alerts = data || []
  if (!alerts.length)
    return (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 text-center text-stone-500 text-sm">
        No alerts for this child.
      </div>
    )

  const severityBg = { urgent: 'border-l-4 border-red-500 bg-red-50', warning: 'border-l-4 border-yellow-500 bg-yellow-50', information: 'border-l-4 border-blue-500 bg-blue-50' }
  return (
    <div className="space-y-3">
      {alerts.map(a => (
        <div key={a.id} className={`rounded-xl shadow p-4 ${severityBg[a.severity] || 'bg-white'}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{a.severity}</span>
              <h4 className="font-semibold text-gray-800 mt-1">
                {a.alert_type_display || String(a.alert_type || '').replace(/_/g, ' ')}
              </h4>
              <p className="text-sm text-gray-600 mt-1">{a.explanation_en}</p>
              <p className="text-sm text-gray-500 mt-1 italic">{a.recommendation_en}</p>
            </div>
            <span className="text-xs text-gray-400">{new Date(a.generated_at).toLocaleDateString()}</span>
          </div>
          {a.status === 'active' && (
            <div className="mt-3 flex gap-2">
              <input value={actionText[a.id] || ''} onChange={e => setActionText(p => ({...p, [a.id]: e.target.value}))}
                placeholder="Action taken…" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={() => actionMutation.mutate({ id: a.id, text: actionText[a.id] || 'Acknowledged' })}
                className="px-3 py-1.5 bg-[#0f2d26] text-white text-sm rounded-lg hover:bg-[#163d34]">Mark actioned</button>
            </div>
          )}
          {a.status !== 'active' && (
            <p className="text-xs text-emerald-800 mt-2 font-medium">Actioned: {a.action_taken || 'Recorded'}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function ReferralsTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-referrals', childId],
    queryFn: () => childrenApi.referrals(childId).then(r => r.data.results || r.data || []),
  })
  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading referrals…</div>
  const referrals = data || []
  if (!referrals.length) return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">No referrals recorded.</div>

  const statusColor = { pending: 'bg-yellow-100 text-yellow-800', attended: 'bg-blue-100 text-blue-800', treatment_given: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-700' }
  return (
    <div className="space-y-3">
      {referrals.map(r => (
        <div key={r.id} className="bg-white rounded-xl shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">{r.health_centre_name}</h4>
              <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
              {r.diagnosis && <p className="text-sm text-gray-500 mt-1"><strong>Diagnosis:</strong> {r.diagnosis}</p>}
              {r.treatment && <p className="text-sm text-gray-500"><strong>Treatment:</strong> {r.treatment}</p>}
              {r.follow_up_instructions && <p className="text-sm text-gray-500"><strong>Follow-up:</strong> {r.follow_up_instructions}</p>}
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[r.status] || ''}`}>{r.status}</span>
              <div className="text-xs text-gray-400 mt-1">{r.referral_date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ImmunisationTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-immunisations', childId],
    queryFn: () => childrenApi.immunisations ? childrenApi.immunisations(childId).then(r => r.data.results || r.data || []) : Promise.resolve([]),
  })
  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading…</div>
  const items = data || []
  if (!items.length) return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">No immunisation records.</div>

  const statusClass = {
    due: 'text-amber-800 bg-amber-50',
    given: 'text-emerald-900 bg-emerald-50',
    overdue: 'text-red-800 bg-red-50',
  }
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-stone-100 text-stone-700 text-xs uppercase tracking-wide">
          <th className="px-4 py-3 text-left">Vaccine</th>
          <th className="px-4 py-3 text-center">Scheduled</th>
          <th className="px-4 py-3 text-center">Given</th>
          <th className="px-4 py-3 text-center">Status</th>
        </tr></thead>
        <tbody>{items.map((im, i) => (
          <tr key={im.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
            <td className="px-4 py-2 font-medium">{im.vaccine_name}</td>
            <td className="px-4 py-2 text-center">{im.scheduled_date}</td>
            <td className="px-4 py-2 text-center">{im.administered_date || '—'}</td>
            <td className="px-4 py-2 text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium capitalize ${statusClass[im.status] || 'bg-stone-100 text-stone-700'}`}
              >
                {im.status}
              </span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function NotesTab({ child }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-display font-semibold text-stone-900 mb-4">Caregiver notes</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guardian</label>
          <p className="text-gray-800">{child.guardian_name} — {child.guardian_phone}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Home Village</label>
          <p className="text-gray-800">{child.home_village || 'Not recorded'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enrolment Date</label>
          <p className="text-gray-800">{child.enrolment_date}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <p className="text-gray-600 bg-gray-50 rounded-lg p-3 min-h-[80px]">{child.notes || 'No caregiver notes yet.'}</p>
        </div>
      </div>
    </div>
  )
}

export default function ChildrenPage() {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [activeTab, setActiveTab] = useState('growth')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['children', search],
    queryFn: () =>
      childrenApi.list({ search }).then(r => {
        const body = r.data
        if (Array.isArray(body)) return body
        return body.results ?? []
      }),
  })

  const TABS = ['growth','measurements','alerts','referrals','immunisation','notes']

  // Load full detail for selected child (list endpoint omits fields like `notes`)
  const { data: selectedDetail } = useQuery({
    queryKey: ['child-detail', selected?.id],
    queryFn: () => childrenApi.get(selected.id).then(r => r.data),
    enabled: !!selected?.id,
  })
  const childDetail = selectedDetail || selected

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <Header title="Child Register" />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: child list */}
        <div className="w-80 border-r bg-white flex flex-col">
          <div className="p-3 border-b">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or Irerero ID…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-center py-8 text-gray-400">Loading…</p>
            ) : isError ? (
              <div className="p-4 text-sm text-red-600">
                <p>{error?.response?.data?.detail || error.message}</p>
                <button type="button" onClick={() => refetch()} className="mt-2 text-blue-600 underline">
                  Retry
                </button>
              </div>
            ) : (data || []).length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                <p>No children in your scope.</p>
                <p className="mt-2 text-xs">Use <strong>sector01</strong> or <strong>manager01</strong> after seeding demo data, or check that the API is running.</p>
              </div>
            ) : (
              (data || []).map(child => (
                <button key={child.id} type="button" onClick={() => { setSelected(child); setActiveTab('growth') }}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 active:bg-blue-50 transition-colors ${selected?.id === child.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <div className="font-medium text-gray-800 text-sm">{child.full_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{child.irerero_id} · {child.age_months}m · {child.sex}</div>
                  {child.overdue && (
                    <span className="text-xs text-amber-900 font-medium">Overdue for measurement</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: child profile — 6 tabs (FR-062) */}
        {selected ? (
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{childDetail?.full_name || selected.full_name}</h2>
                  <p className="text-sm text-gray-500">
                    {(childDetail?.irerero_id || selected.irerero_id)} · {(childDetail?.age_months ?? selected.age_months)} months · {(childDetail?.sex || selected.sex)} · {(childDetail?.centre_name || selected.centre_name)}
                  </p>
                </div>
                <StatusBadge status={childDetail?.nutritional_status || selected.nutritional_status || 'normal'} />
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mt-4 border-b">
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors ${activeTab === tab ? 'bg-[#0f2d26] text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              {activeTab === 'growth'        && <GrowthChart childId={selected.id} />}
              {activeTab === 'measurements'  && <MeasurementsTab childId={selected.id} />}
              {activeTab === 'alerts'        && <AlertsTab childId={selected.id} />}
              {activeTab === 'referrals'     && <ReferralsTab childId={selected.id} />}
              {activeTab === 'immunisation'  && <ImmunisationTab childId={selected.id} />}
              {activeTab === 'notes'         && <NotesTab child={childDetail || selected} />}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-500 bg-stone-50/80">
            <div className="text-center max-w-sm px-6">
              <p className="text-sm font-medium text-stone-700">No child selected</p>
              <p className="mt-2 text-sm leading-relaxed">Choose a child from the list to open growth charts, measurements, and alerts.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
