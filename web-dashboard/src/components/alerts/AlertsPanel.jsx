// src/components/alerts/AlertsPanel.jsx
// Real-time alerts panel — WebSocket push, urgency ordering — FR-034
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../../services/api'
import { useWebSocket } from '../../hooks/useWebSocket'

const SEV_COLOUR = {
  urgent: 'border-l-coral bg-surface-blush',
  warning: 'border-l-amber bg-surface-cream',
  information: 'border-l-sage bg-surface-mint/50',
}
const SEV_LABEL = {
  urgent: { text: 'Urgent', className: 'text-coral' },
  warning: { text: 'Warning', className: 'text-amber' },
  information: { text: 'Information', className: 'text-forest' },
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
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-ink-display">No active alerts</p>
        <p className="text-xs text-ink-muted mt-2 leading-relaxed">New items will appear here when raised.</p>
      </div>
    )

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-ink-display text-base tracking-wide mb-4">
        Active alerts ({alerts.length})
      </h3>
      <div className="space-y-3">
        {alerts.map(alert => {
          const sev = SEV_LABEL[alert.severity] || SEV_LABEL.warning
          return (
            <div
              key={alert.id}
              className={`border-l-[3px] rounded-2xl p-4 border border-border-subtle ${SEV_COLOUR[alert.severity] || SEV_COLOUR.warning}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                    <span className={`text-xs font-semibold tracking-wide ${sev.className}`}>{sev.text}</span>
                    <span className="text-xs text-ink-muted">{alert.child_name}</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{alert.explanation_en}</p>
                  <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{alert.recommendation_en}</p>
                  <p className="text-xs text-ink-placeholder mt-2 tabular-nums">
                    Guardian {alert.guardian_phone} · {new Date(alert.generated_at).toLocaleString()}
                  </p>
                </div>
                {!compact && alert.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setActioningId(alert.id)}
                    className="shrink-0 px-3 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-hover transition-colors duration-200"
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
                    className="flex-1 min-w-[12rem] input-field py-2"
                  />
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate({ id: alert.id, text: actionText })}
                    className="px-3 py-2 bg-sage text-white text-xs font-semibold rounded-lg hover:bg-sage-muted transition-colors duration-200"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setActioningId(null)}
                    className="px-3 py-2 rounded-lg border-[1.5px] border-border-warm bg-surface-card text-ink text-xs font-semibold hover:bg-surface-blush transition-colors duration-200"
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
