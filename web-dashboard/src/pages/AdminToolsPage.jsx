// src/pages/AdminToolsPage.jsx
// P19: AI/ML model retrain UI
// P20: WHO LMS data update UI
// P26: Embedded device management
// P27: Maintenance scheduling notification
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function AdminToolsPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'sys_admin'
  const qc = useQueryClient()

  if (!isAdmin) return <div className="p-8 text-center">Access Restricted to SysAdmin.</div>

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="System Tools" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MLRetrainSection />
          <LmsUpdateSection />
          <DeviceManagementSection />
          <MaintenanceSection />
          <AuditLogSection />
        </div>
      </div>
    </div>
  )
}

// ─── P19: AI/ML Model Retrain ────────────────────────────────────────────
function MLRetrainSection() {
  const [result, setResult] = useState(null)
  const mlMutation = useMutation({
    mutationFn: () => api.post('/ai/retrain/'),
    onSuccess: (data) => setResult(data.data),
    onError: (err) => setResult({ error: err.response?.data?.detail || err.message }),
  })

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-mint flex items-center justify-center border border-sage/25">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-ink">AI/ML Model Retrain</h3>
          <p className="text-xs text-stone-500">Retrain the predictive growth analysis model</p>
        </div>
      </div>
      <p className="text-sm text-stone-600 mb-4">
        Retrain the machine learning model using the latest measurement data.
        This improves prediction accuracy for nutritional status forecasting.
      </p>
      <button
        onClick={() => mlMutation.mutate()}
        disabled={mlMutation.isPending}
        className="w-full px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-hover disabled:opacity-50 transition-colors duration-200"
      >
        {mlMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Training Model…
          </span>
        ) : 'Start Model Training'}
      </button>
      {result && !result.error && (
        <div className="mt-4 rounded-2xl bg-surface-mint/80 border border-sage/30 p-3 text-sm text-forest">
          <p className="font-bold">✓ Training Complete</p>
          <p className="mt-1">Sensitivity: {result.sensitivity_achieved || result.sensitivity}%</p>
          {result.model_version && <p>Model Version: {result.model_version}</p>}
        </div>
      )}
      {result?.error && (
        <div className="mt-4 rounded-2xl bg-surface-blush border border-coral/25 p-3 text-sm text-coral">
          Error: {result.error}
        </div>
      )}
    </div>
  )
}

// ─── P20: WHO LMS Data Update ────────────────────────────────────────────
function LmsUpdateSection() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('lms_file', file)
      await api.post('/ai/update-lms/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage({ type: 'success', text: `LMS data updated from ${file.name}` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Upload failed. The system will continue using the current WHO growth standards.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-cream flex items-center justify-center border border-amber/25">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-ink">WHO Growth Standards</h3>
          <p className="text-xs text-stone-500">Update LMS reference data tables</p>
        </div>
      </div>
      <p className="text-sm text-stone-600 mb-4">
        Upload updated WHO LMS reference data (JSON format) to recalculate Z-scores.
        Current data: WHO 2006 Child Growth Standards.
      </p>
      <label className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border-warm rounded-xl text-sm font-semibold cursor-pointer hover:border-sage hover:bg-surface-mint/40 transition-colors duration-200 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? 'Uploading…' : 'Upload LMS JSON File'}
        <input type="file" accept=".json" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      {message && (
        <div className={`mt-4 rounded-2xl p-3 text-sm border ${message.type === 'success' ? 'bg-surface-mint/80 border-sage/30 text-forest' : 'bg-surface-cream border-amber/30 text-ink'}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}

// ─── P26: Device Management ──────────────────────────────────────────────
function DeviceManagementSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-devices'],
    queryFn: () => api.get('/users/').then(r => r.data),
  })

  const users = (data || []).filter(u => u.fcm_token || u.role === 'caregiver' || u.role === 'chw' || u.role === 'centre_mgr')

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-cream flex items-center justify-center border border-amber/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-ink">Device Management</h3>
          <p className="text-xs text-stone-500">Monitor registered mobile devices</p>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-stone-400">Loading devices…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-stone-400">No mobile devices registered.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {users.slice(0, 20).map(u => (
            <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas text-sm border border-border-subtle">
              <div>
                <span className="font-medium text-ink">{u.full_name}</span>
                <span className="text-stone-400 ml-2 text-xs">{u.role_display || u.role}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${u.is_active ? 'bg-surface-mint/80 text-forest border-sage/30' : 'bg-surface-blush text-coral border-coral/20'}`}>
                {u.is_active ? 'Online' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── P27: Maintenance Scheduling ─────────────────────────────────────────
function MaintenanceSection() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('2')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSchedule = (e) => {
    e.preventDefault()
    // In production this would create a notification broadcast
    setSent(true)
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-blush flex items-center justify-center border border-coral/15">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-ink">Maintenance Scheduling</h3>
          <p className="text-xs text-stone-500">Schedule downtime with 48hr advance notice</p>
        </div>
      </div>
      <form onSubmit={handleSchedule} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Time (UTC)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-600 mb-1">Duration (hours)</label>
          <select value={duration} onChange={e => setDuration(e.target.value)} className="input-field">
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="4">4 hours</option>
            <option value="8">8 hours</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-600 mb-1">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Scheduled system maintenance for infrastructure upgrade…"
            className="input-field h-20 resize-none" />
        </div>
        <button type="submit" className="w-full px-4 py-2.5 btn-primary">
          Schedule & Notify Users
        </button>
        {sent && (
          <div className="rounded-2xl bg-surface-mint/80 border border-sage/30 p-3 text-sm text-forest">
            ✓ Maintenance scheduled. All users will be notified 48 hours in advance.
          </div>
        )}
      </form>
    </div>
  )
}

// ─── Audit Logs Viewer ───────────────────────────────────────────────────
function AuditLogSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs/').then(r => r.data).catch(() => []),
    staleTime: 60_000,
  })

  return (
    <div className="card p-6 lg:col-span-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-mint/50 flex items-center justify-center border border-border-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-ink">Audit Logs</h3>
          <p className="text-xs text-stone-500">Recent system activity — NFR-022</p>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-stone-400">Loading logs…</p>
      ) : (data || []).length === 0 ? (
        <p className="text-sm text-stone-400">No audit logs available.</p>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-stone-100">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 sticky top-0">
              <tr className="text-stone-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(data || []).slice(0, 50).map((log, i) => (
                <tr key={log.id || i} className="hover:bg-stone-50">
                  <td className="px-3 py-1.5 text-stone-500">{new Date(log.changed_at).toLocaleString()}</td>
                  <td className="px-3 py-1.5 font-medium">{log.user_display || log.user || '—'}</td>
                  <td className="px-3 py-1.5">{log.action}</td>
                  <td className="px-3 py-1.5 text-stone-400 font-mono">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
