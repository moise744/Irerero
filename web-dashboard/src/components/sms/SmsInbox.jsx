// src/components/sms/SmsInbox.jsx
// Real-time SMS Inbox — MockSmsProvider pushes via WebSocket — FR-080

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { smsApi } from '../../services/api'
import { useWebSocket } from '../../hooks/useWebSocket'

const MSG_TYPE_LABELS = {
  sam_alert: { label: 'SAM alert', colour: 'bg-surface-blush text-coral border border-coral/20' },
  referral_created: { label: 'Referral', colour: 'bg-surface-mint/80 text-forest border border-sage/25' },
  weekly_progress: { label: 'Weekly update', colour: 'bg-surface-mint/80 text-forest border border-sage/25' },
  absence_followup: { label: 'Absence follow-up', colour: 'bg-surface-cream text-amber border border-amber/25' },
  batch_reminder: { label: 'Batch reminder', colour: 'bg-surface-flex text-forest border border-sage/20' },
}

export default function SmsInbox() {
  const [live, setLive] = useState([])

  const { data: historical = [] } = useQuery({
    queryKey: ['sms-log'],
    queryFn: () => smsApi.log().then(r => r.data.results || r.data),
    refetchInterval: 30_000,
  })

  const onWsMessage = useCallback(msg => {
    if (msg.type === 'sms.new' || msg.data) {
      setLive(prev => [msg.data || msg, ...prev].slice(0, 50))
    }
  }, [])
  useWebSocket('/ws/sms-log/', onWsMessage)

  const all = [...live, ...historical].slice(0, 100)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-display font-semibold text-ink-display text-base tracking-wide">SMS inbox (simulated)</h3>
        <span className="text-xs bg-surface-mint/90 text-forest px-2.5 py-1 rounded-lg font-semibold tabular-nums shrink-0 border border-sage/25">
          {live.length} live
        </span>
      </div>

      {all.length === 0 ? (
        <p className="text-ink-muted text-sm text-center py-8 leading-relaxed">
          No messages yet. Trigger an alert to see simulated SMS appear here in real-time.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {all.map((sms, i) => {
            const type =
              MSG_TYPE_LABELS[sms.msg_type] || {
                label: sms.msg_type,
                colour: 'bg-surface-card text-ink border border-border-subtle',
              }
            const isNew = i < live.length
            return (
              <div
                key={sms.id || i}
                className={`rounded-2xl p-4 border ${
                  isNew ? 'border-sage/40 bg-surface-mint/40' : 'border-border-subtle bg-surface-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${type.colour}`}>{type.label}</span>
                    {isNew && (
                      <span className="text-xs bg-coral/12 text-coral px-2 py-0.5 rounded-lg font-semibold tracking-wide">
                        Live
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-placeholder">
                    {sms.sent_at ? new Date(sms.sent_at).toLocaleTimeString() : 'just now'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-ink">{sms.recipient_phone}</p>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">{sms.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs font-semibold ${sms.status === 'delivered' ? 'text-sage' : 'text-coral'}`}
                  >
                    {sms.status === 'delivered' ? '✓ Delivered' : '✗ Failed'}
                  </span>
                  <span className="text-xs text-ink-placeholder">via {sms.provider || 'mock'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
