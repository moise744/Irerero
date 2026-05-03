// src/components/alerts/AlertsPanel.jsx
// Real-time alerts panel — WebSocket push, urgency ordering — FR-034
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../../services/api'
import { useWebSocket } from '../../hooks/useWebSocket'

const SEV_COLOUR = {
  urgent: 'border-red-500 bg-red-50',
  warning: 'border-amber-400 bg-amber-50',
  information: 'border-sky-400 bg-sky-50',
}
const SEV_LABEL = {
  urgent: { text: 'Urgent', className: 'text-red-800' },
  warning: { text: 'Warning', className: 'text-amber-900' },
  information: { text: 'Information', className: 'text-sky-900' },
}

export default function AlertsPanel({ compact = false }) {
  const qc = useQueryClient()
  const [liveAlerts, setLiveAlerts] = useState([])
  const [actioningId, setActioningId] = useState(null)
  const [actionText, setActionText] = useState('')

  const { data } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => alertsApi.list({ status: 'active' }).then(r => r.data.results || r.data),
    refetchInterval: 60_000,
  })

  const onWsAlert = useCallback(msg => {
    if (msg.data) setLiveAlerts(prev => [msg.data, ...prev].slice(0, 20))
  }, [])
  useWebSocket('/ws/alerts/', onWsAlert)

  const actionMutation = useMutation({
    mutationFn: ({ id, text }) => alertsApi.action(id, text),
    onSuccess: () => {
      qc.invalidateQueries(['alerts'])
      setActioningId(null)
      setActionText('')
    },
  })

  const alerts = [...liveAlerts, ...(data || [])]
    .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
    .slice(0, compact ? 5 : 50)

  if (alerts.length === 0)
    return (
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-6 text-center">
        <p className="text-sm font-medium text-stone-700">No active alerts</p>
        <p className="text-xs text-stone-500 mt-1">New items will appear here when raised.</p>
      </div>
    )

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
      <h3 className="font-display font-semibold text-stone-900 text-base mb-4">Active alerts ({alerts.length})</h3>
      <div className="space-y-3">
        {alerts.map(alert => {
          const sev = SEV_LABEL[alert.severity] || SEV_LABEL.warning
          return (
            <div
              key={alert.id}
              className={`border-l-[3px] rounded-r-lg p-4 ${SEV_COLOUR[alert.severity] || SEV_COLOUR.warning}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${sev.className}`}>
                      {sev.text}
                    </span>
                    <span className="text-xs text-stone-500">{alert.child_name}</span>
                  </div>
                  <p className="text-sm text-stone-800 leading-snug">{alert.explanation_en}</p>
                  <p className="text-xs text-stone-600 mt-1.5 leading-snug">{alert.recommendation_en}</p>
                  <p className="text-xs text-stone-400 mt-2 tabular-nums">
                    Guardian {alert.guardian_phone} · {new Date(alert.generated_at).toLocaleString()}
                  </p>
                </div>
                {!compact && alert.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setActioningId(alert.id)}
                    className="shrink-0 px-3 py-1.5 bg-[#0f2d26] text-white text-xs font-medium rounded-md hover:bg-[#163d34]"
                  >
                    Action
                  </button>
                )}
              </div>
              {actioningId === alert.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={actionText}
                    onChange={e => setActionText(e.target.value)}
                    placeholder="What action did you take?"
                    className="flex-1 min-w-[12rem] border border-stone-300 rounded-md px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate({ id: alert.id, text: actionText })}
                    className="px-3 py-1.5 bg-emerald-800 text-white text-xs font-medium rounded-md hover:bg-emerald-900"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setActioningId(null)}
                    className="px-3 py-1.5 bg-stone-200 text-stone-800 text-xs font-medium rounded-md hover:bg-stone-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
