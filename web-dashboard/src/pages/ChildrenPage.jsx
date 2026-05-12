// src/pages/ChildrenPage.jsx — FR-015 searchable child register with 7 profile tabs
// P3: Sensitive fields visible for Centre Manager+
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenApi, alertsApi } from '../services/api'
import StatusBadge from '../components/layout/StatusBadge'
import Header from '../components/layout/Header'
import GrowthChart from '../components/charts/GrowthChart'
import { useAuthStore } from '../hooks/useAuth'

function MeasurementsTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-measurements', childId],
    queryFn: () => childrenApi.measurements(childId).then(r => r.data.results || r.data || []),
  })
  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading measurements…</div>
  const measurements = data || []
  if (!measurements.length) return <div className="card p-8 text-center text-ink-muted text-sm">No measurements recorded yet.</div>
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead><tr className="bg-surface-blush/90 text-forest text-xs font-semibold tracking-wide">
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
          <tr key={m.id} className={`${i % 2 === 0 ? 'bg-canvas' : 'bg-surface-card'} ${m.biv_flagged ? 'bg-surface-cream/80' : ''}`}>
            <td className="px-4 py-2">{new Date(m.recorded_at).toLocaleDateString()}</td>
            <td className="px-4 py-2 text-center">{m.weight_kg || '—'}</td>
            <td className="px-4 py-2 text-center">{m.height_cm || '—'}</td>
            <td className="px-4 py-2 text-center">{m.muac_cm || '—'}</td>
            <td className="px-4 py-2 text-center">{m.temperature_c || '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.waz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.haz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center font-mono text-xs">{m.whz_score ?? '—'}</td>
            <td className="px-4 py-2 text-center"><StatusBadge status={m.nutritional_status} /></td>
            <td className="px-4 py-2 text-center text-xs text-ink-muted">{m.source}</td>
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

  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading alerts…</div>
  const alerts = data || []
  if (!alerts.length)
    return (
      <div className="card p-8 text-center text-ink-muted text-sm leading-relaxed">
        No alerts for this child.
      </div>
    )

  const severityBg = {
    urgent: 'border-l-4 border-coral bg-surface-blush',
    warning: 'border-l-4 border-amber bg-surface-cream',
    information: 'border-l-4 border-sage bg-surface-mint/50',
  }
  return (
    <div className="space-y-3">
      {alerts.map(a => (
        <div key={a.id} className={`rounded-2xl border border-border-subtle p-5 ${severityBg[a.severity] || 'bg-surface-card'}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold tracking-wide text-ink-muted capitalize">{a.severity}</span>
              <h4 className="font-semibold text-ink-display mt-1">
                {a.alert_type_display || String(a.alert_type || '').replace(/_/g, ' ')}
              </h4>
              <p className="text-sm text-ink mt-2 leading-relaxed">{a.explanation_en}</p>
              <p className="text-sm text-ink-muted mt-1 italic leading-relaxed">{a.recommendation_en}</p>
            </div>
            <span className="text-xs text-ink-placeholder">{new Date(a.generated_at).toLocaleDateString()}</span>
          </div>
          {a.status === 'active' && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <input value={actionText[a.id] || ''} onChange={e => setActionText(p => ({...p, [a.id]: e.target.value}))}
                placeholder="Action taken…" className="flex-1 min-w-[8rem] input-field py-2" />
              <button type="button" onClick={() => actionMutation.mutate({ id: a.id, text: actionText[a.id] || 'Acknowledged' })}
                className="px-4 py-2 bg-forest text-white text-sm rounded-lg hover:bg-forest-hover transition-colors font-semibold">Mark actioned</button>
            </div>
          )}
          {a.status !== 'active' && (
            <p className="text-xs text-forest mt-2 font-semibold">Actioned: {a.action_taken || 'Recorded'}</p>
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
  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading referrals…</div>
  const referrals = data || []
  if (!referrals.length) return <div className="card p-8 text-center text-ink-muted text-sm">No referrals recorded.</div>

  const statusColor = {
    pending: 'bg-surface-cream text-amber border border-amber/30',
    attended: 'bg-surface-mint/80 text-forest border border-sage/30',
    treatment_given: 'bg-surface-mint/90 text-forest border border-sage/30',
    closed: 'bg-surface-blush/60 text-ink-muted border border-border-subtle',
  }
  return (
    <div className="space-y-3">
      {referrals.map(r => (
        <div key={r.id} className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-ink-display">{r.health_centre_name}</h4>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">{r.reason}</p>
              {r.diagnosis && <p className="text-sm text-ink-muted mt-1"><strong className="text-forest">Diagnosis:</strong> {r.diagnosis}</p>}
              {r.treatment && <p className="text-sm text-ink-muted"><strong className="text-forest">Treatment:</strong> {r.treatment}</p>}
              {r.follow_up_instructions && <p className="text-sm text-ink-muted"><strong className="text-forest">Follow-up:</strong> {r.follow_up_instructions}</p>}
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-lg font-semibold capitalize ${statusColor[r.status] || ''}`}>{r.status}</span>
              <div className="text-xs text-ink-placeholder mt-1">{r.referral_date}</div>
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
  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading…</div>
  const items = data || []
  if (!items.length) return <div className="card p-8 text-center text-ink-muted text-sm">No immunisation records.</div>

  const statusClass = {
    due: 'text-amber bg-surface-cream border border-amber/25',
    given: 'text-forest bg-surface-mint/80 border border-sage/25',
    overdue: 'text-coral bg-surface-blush border border-coral/20',
  }
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead><tr className="bg-surface-blush/90 text-forest text-xs font-semibold tracking-wide">
          <th className="px-4 py-3 text-left">Vaccine</th>
          <th className="px-4 py-3 text-center">Scheduled</th>
          <th className="px-4 py-3 text-center">Given</th>
          <th className="px-4 py-3 text-center">Status</th>
        </tr></thead>
        <tbody>{items.map((im, i) => (
          <tr key={im.id} className={i % 2 === 0 ? 'bg-canvas' : 'bg-surface-card'}>
            <td className="px-4 py-2 font-medium">{im.vaccine_name}</td>
            <td className="px-4 py-2 text-center">{im.scheduled_date}</td>
            <td className="px-4 py-2 text-center">{im.administered_date || '—'}</td>
            <td className="px-4 py-2 text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold capitalize border ${statusClass[im.status] || 'bg-surface-blush/50 text-ink border-border-subtle'}`}
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

function AttendanceTab({ childId }) {
  // P24: Attendance history tab
  const { data, isLoading } = useQuery({
    queryKey: ['child-attendance', childId],
    queryFn: () => import('../services/api').then(m => m.default.get('/attendance/', { params: { child: childId } })).then(r => r.data.results || r.data || []),
  })
  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading attendance…</div>
  const records = data || []
  if (!records.length) return <div className="card p-8 text-center text-ink-muted text-sm">No attendance records yet.</div>
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead><tr className="bg-surface-blush/90 text-forest text-xs font-semibold tracking-wide">
          <th className="px-4 py-3 text-left">Date</th>
          <th className="px-4 py-3 text-center">Status</th>
          <th className="px-4 py-3 text-left">Absence Reason</th>
        </tr></thead>
        <tbody>{records.slice(0, 60).map((a, i) => (
          <tr key={a.id || i} className={i % 2 === 0 ? 'bg-canvas' : 'bg-surface-card'}>
            <td className="px-4 py-2">{a.date}</td>
            <td className="px-4 py-2 text-center">
              <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold border ${a.status === 'present' ? 'bg-surface-mint/90 text-forest border-sage/30' : 'bg-surface-blush text-coral border-coral/20'}`}>
                {a.status}
              </span>
            </td>
            <td className="px-4 py-2 text-ink-muted">{a.absence_reason || '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function NutritionTab({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['child-nutrition', childId],
    queryFn: () => import('../services/api').then(m => m.default.get('/nutrition/', { params: { child: childId } })).then(r => r.data.results || r.data || []),
  })
  if (isLoading) return <div className="text-center py-8 text-ink-muted text-sm">Loading nutrition data…</div>
  const records = data || []
  if (!records.length) return <div className="card p-8 text-center text-ink-muted text-sm">Not enrolled in any nutrition programme.</div>
  return (
    <div className="space-y-3">
      {records.map(n => (
        <div key={n.id} className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-ink-display capitalize">{n.programme_type === 'tfp' ? 'Therapeutic Feeding (RUTF)' : 'Supplementary Feeding (SFP)'}</h4>
              <p className="text-sm text-ink-muted mt-1">Enrolled: {n.enrolment_date} {n.expected_end_date ? `→ Expected end: ${n.expected_end_date}` : ''}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-lg font-semibold capitalize border ${n.outcome === 'ongoing' ? 'bg-surface-mint/80 text-forest border-sage/30' : n.outcome === 'graduated' ? 'bg-surface-mint text-forest border-sage/40' : 'bg-surface-blush/60 text-ink-muted border-border-subtle'}`}>
              {n.outcome}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesTab({ child }) {
  // P3: Show sensitive fields for Centre Manager+
  const user = useAuthStore(s => s.user)
  const canSeeSensitive = ['centre_mgr', 'sector', 'district', 'national', 'sys_admin'].includes(user?.role)

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-display font-semibold text-ink-display tracking-wide mb-4">Caregiver notes</h3>
        <div className="space-y-4">
          <div>
            <label className="field-label">Guardian</label>
            <p className="text-ink leading-relaxed">{child.guardian_name} — {child.guardian_phone}</p>
          </div>
          <div>
            <label className="field-label">Home village</label>
            <p className="text-ink leading-relaxed">{child.home_village || 'Not recorded'}</p>
          </div>
          <div>
            <label className="field-label">Enrolment date</label>
            <p className="text-ink leading-relaxed">{child.enrolment_date}</p>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <p className="text-ink-muted bg-canvas rounded-lg p-4 min-h-[80px] leading-relaxed border border-border-subtle">{child.notes || 'No caregiver notes yet.'}</p>
          </div>
        </div>
      </div>

      {canSeeSensitive && (
        <div className="card p-6 border-l-4 border-amber">
          <h3 className="font-display font-semibold text-ink-display tracking-wide mb-1">Sensitive information</h3>
          <p className="text-xs text-ink-muted mb-4 leading-relaxed">Only visible to Centre Manager, Sector Coordinator, and above — FR-017</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Orphan status</label>
              <p className="text-ink">{child.is_orphan === true ? '✓ Yes' : child.is_orphan === false ? '✗ No' : 'Not recorded'}</p>
            </div>
            <div>
              <label className="field-label">Disability</label>
              <p className="text-ink">{child.has_disability === true ? '✓ Yes' : child.has_disability === false ? '✗ No' : 'Not recorded'}</p>
            </div>
            <div>
              <label className="field-label">HIV exposure status</label>
              <p className="text-ink">{child.hiv_exposure_status || 'Not recorded'}</p>
            </div>
            <div>
              <label className="field-label">Chronic conditions</label>
              <p className="text-ink">{child.chronic_conditions || 'None recorded'}</p>
            </div>
          </div>
        </div>
      )}
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

  const TABS = ['growth','attendance','measurements','nutrition','alerts','referrals','immunisation','notes']

  // Load full detail for selected child (list endpoint omits fields like `notes`)
  const { data: selectedDetail } = useQuery({
    queryKey: ['child-detail', selected?.id],
    queryFn: () => childrenApi.get(selected.id).then(r => r.data),
    enabled: !!selected?.id,
  })
  const childDetail = selectedDetail || selected

  return (
    <div className="flex-1 overflow-auto flex flex-col bg-canvas">
      <Header title="Child Register" />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-80 border-r border-border-subtle bg-surface-card flex flex-col shrink-0">
          <div className="p-4 border-b border-border-subtle">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or Irerero ID…"
              className="input-field"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-center py-8 text-ink-muted text-sm">Loading…</p>
            ) : isError ? (
              <div className="p-4 text-sm text-coral">
                <p>{error?.response?.data?.detail || error.message}</p>
                <button type="button" onClick={() => refetch()} className="mt-2 text-forest font-semibold hover:text-coral transition-colors">
                  Retry
                </button>
              </div>
            ) : (data || []).length === 0 ? (
              <div className="p-6 text-center text-ink-muted text-sm leading-relaxed">
                <p>No children in your scope.</p>
                <p className="mt-2 text-xs">
                  Use <strong className="text-forest">sector01</strong> or <strong className="text-forest">manager01</strong> after seeding demo data, or check that the API is running.
                </p>
              </div>
            ) : (
              (data || []).map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelected(child)
                    setActiveTab('growth')
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-surface-mint/30 transition-colors duration-200 ${
                    selected?.id === child.id ? 'bg-surface-mint/50 border-l-4 border-l-coral' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="font-semibold text-ink text-sm">{child.full_name}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {child.irerero_id} · {child.age_months}m · {child.sex}
                  </div>
                  {child.overdue && <span className="text-xs text-coral font-semibold">Overdue for measurement</span>}
                </button>
              ))
            )}
          </div>
        </div>

        {selected ? (
          <div className="flex-1 overflow-y-auto bg-canvas min-w-0">
            <div className="bg-surface-card border-b border-border-subtle px-6 py-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {childDetail?.photo || selected.photo ? (
                    <img
                      src={childDetail?.photo || selected.photo}
                      alt={childDetail?.full_name || selected.full_name}
                      className="w-14 h-14 rounded-2xl object-cover border border-border-subtle"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-surface-mint/50 flex items-center justify-center text-forest border border-border-subtle">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-extrabold text-ink-display font-display tracking-wide">
                      {childDetail?.full_name || selected.full_name}
                    </h2>
                    <p className="text-sm text-ink-muted mt-1">
                      {childDetail?.irerero_id || selected.irerero_id} · {childDetail?.age_months ?? selected.age_months} months ·{' '}
                      {childDetail?.sex || selected.sex} · {childDetail?.centre_name || selected.centre_name}
                    </p>
                  </div>
                </div>
                <StatusBadge status={childDetail?.nutritional_status || selected.nutritional_status || 'normal'} />
              </div>
              <div className="flex gap-1 mt-5 flex-wrap border-b border-border-subtle -mb-px">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-semibold capitalize rounded-t-xl transition-colors duration-200 ${
                      activeTab === tab ? 'bg-forest text-white' : 'text-ink-muted hover:bg-surface-mint/40 hover:text-forest'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 md:p-8">
              {activeTab === 'growth'        && <GrowthChart childId={selected.id} />}
              {activeTab === 'attendance'    && <AttendanceTab childId={selected.id} />}
              {activeTab === 'measurements'  && <MeasurementsTab childId={selected.id} />}
              {activeTab === 'nutrition'     && <NutritionTab childId={selected.id} />}
              {activeTab === 'alerts'        && <AlertsTab childId={selected.id} />}
              {activeTab === 'referrals'     && <ReferralsTab childId={selected.id} />}
              {activeTab === 'immunisation'  && <ImmunisationTab childId={selected.id} />}
              {activeTab === 'notes'         && <NotesTab child={childDetail || selected} />}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-muted bg-surface-mint/20 min-w-0">
            <div className="text-center max-w-sm px-6">
              <p className="text-sm font-semibold text-ink-display">No child selected</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">Choose a child from the list to open growth charts, measurements, and alerts.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
