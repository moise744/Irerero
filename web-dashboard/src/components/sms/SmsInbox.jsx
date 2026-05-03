// src/components/sms/SmsInbox.jsx
// Real-time SMS Inbox — MockSmsProvider pushes via WebSocket — FR-080
// Dashboard SMS Inbox panel that updates live without page reload

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { smsApi } from '../../services/api'
import { useWebSocket } from '../../hooks/useWebSocket'

const MSG_TYPE_LABELS = {
  sam_alert:        { label: 'SAM Alert',          colour: 'bg-red-100 text-red-800' },
  referral_created: { label: 'Referral',            colour: 'bg-blue-100 text-blue-800' },
  weekly_progress:  { label: 'Weekly Update',       colour: 'bg-green-100 text-green-800' },
  absence_followup: { label: 'Absence Follow-up',   colour: 'bg-orange-100 text-orange-800' },
  batch_reminder:   { label: 'Batch Reminder',      colour: 'bg-purple-100 text-purple-800' },
}

export default function SmsInbox() {
  const [live, setLive] = useState([])

  // Load historical SMS log from API — FR-080
  const { data: historical = [] } = useQuery({
    queryKey: ['sms-log'],
    queryFn:  () => smsApi.log().then(r => r.data.results || r.data),
    refetchInterval: 30_000,
  })

  // Real-time push via WebSocket — architecture §5.4
  const onWsMessage = useCallback(msg => {
    if (msg.type === 'sms.new' || msg.data) {
      setLive(prev => [msg.data || msg, ...prev].slice(0, 50))
    }
  }, [])
  useWebSocket('/ws/sms-log/', onWsMessage)

  const all = [...live, ...historical].slice(0, 100)

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-display font-semibold text-stone-900 text-base">SMS inbox (simulated)</h3>
        <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-medium tabular-nums shrink-0">
          {live.length} live
        </span>
      </div>

      {all.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          No messages yet. Trigger an alert to see simulated SMS appear here in real-time.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {all.map((sms, i) => {
            const type  = MSG_TYPE_LABELS[sms.msg_type] || { label: sms.msg_type, colour: 'bg-gray-100 text-gray-700' }
            const isNew = i < live.length
            return (
              <div key={sms.id || i}
                className={`border rounded-lg p-3 ${isNew ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${type.colour}`}>
                      {type.label}
                    </span>
                    {isNew && <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">LIVE</span>}
                  </div>
                  <span className="text-xs text-gray-400">
                    {sms.sent_at ? new Date(sms.sent_at).toLocaleTimeString() : 'just now'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">{sms.recipient_phone}</p>
                <p className="text-sm text-gray-600 mt-1">{sms.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${sms.status === 'delivered' ? 'text-green-600' : 'text-red-500'}`}>
                    {sms.status === 'delivered' ? '✓ Delivered' : '✗ Failed'}
                  </span>
                  <span className="text-xs text-gray-400">via {sms.provider || 'mock'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
