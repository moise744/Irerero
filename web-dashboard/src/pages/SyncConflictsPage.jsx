import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function SyncConflictsPage() {
  const user = useAuthStore(s => s.user)
  const isCentreMgr = user?.role === 'centre_mgr' || user?.role === 'sys_admin'
  const qc = useQueryClient()

  const { data: conflicts, isLoading } = useQuery({
    queryKey: ['sync-conflicts'],
    queryFn: () => api.get('/sync/conflicts/').then(r => r.data),
    enabled: isCentreMgr,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }) => api.post(`/sync/conflicts/${id}/resolve/`, { resolution }),
    onSuccess: () => {
      alert('Conflict resolved.')
      qc.invalidateQueries(['sync-conflicts'])
    },
    onError: err => alert(`Error: ${err.response?.data?.detail || err.message}`),
  })

  if (!isCentreMgr)
    return (
      <div className="p-8 text-center text-ink-muted bg-canvas min-h-[40vh] flex items-center justify-center">
        Access restricted to centre managers.
      </div>
    )

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Sync Conflicts" />

      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold font-display text-ink-display tracking-wide">Resolve data conflicts</h2>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">Review cases where two offline devices edited the same record.</p>
        </div>

        {isLoading ? (
          <p className="text-ink-muted">Loading conflicts…</p>
        ) : (
          <div className="space-y-6">
            {(conflicts?.length === 0 || !conflicts) && (
              <div className="bg-surface-mint/50 text-forest p-6 rounded-2xl border border-sage/30 font-semibold flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All caught up — no sync conflicts to resolve.
              </div>
            )}
            {(conflicts || []).map(c => (
              <div key={c.id} className="card p-6 border-l-4 border-l-coral">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-bold text-lg text-coral font-display tracking-wide">Conflict ID: {c.id}</h3>
                    <p className="text-sm text-ink-muted font-medium mt-2">
                      Model: <span className="text-forest">{c.model_name}</span> · Record:{' '}
                      <span className="text-forest">{c.record_id}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-canvas rounded-2xl border border-border-subtle">
                    <h4 className="font-semibold text-xs text-forest mb-3 tracking-wide">Server version</h4>
                    <pre className="text-xs overflow-auto text-ink-muted font-mono leading-relaxed">{JSON.stringify(c.server_data, null, 2)}</pre>
                  </div>
                  <div className="p-4 bg-surface-blush/50 rounded-2xl border border-coral/20">
                    <h4 className="font-semibold text-xs text-coral mb-3 tracking-wide">Device version (conflict)</h4>
                    <pre className="text-xs overflow-auto text-ink-muted font-mono leading-relaxed">{JSON.stringify(c.client_data, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'keep_server' })}
                    className="btn-ghost"
                  >
                    Keep server version
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'accept_client' })}
                    className="btn-primary"
                  >
                    Accept device version
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
