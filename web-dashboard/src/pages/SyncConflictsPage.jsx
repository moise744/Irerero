import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function SyncConflictsPage() {
  const user = useAuthStore(s => s.user)
  const isCentreMgr = user?.role === 'centre_mgr' || user?.role === 'sys_admin'
  const qc = useQueryClient()

  // Fetch sync conflicts (mocking endpoint logic since it was partially stubbed)
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
    onError: (err) => alert(`Error: ${err.response?.data?.detail || err.message}`)
  })

  if (!isCentreMgr) return <div className="p-8 text-center">Access Restricted to Centre Managers.</div>

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Sync Conflicts" />
      
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-display text-ink tracking-tight">Resolve Data Conflicts</h2>
          <p className="text-sm text-stone-500 mt-1">Review cases where two offline devices edited the same record.</p>
        </div>

        {isLoading ? <p>Loading conflicts...</p> : (
          <div className="space-y-4">
            {(conflicts?.length === 0 || !conflicts) && (
              <div className="bg-teal/10 text-teal p-5 rounded-xl border border-teal/20 font-semibold flex items-center gap-3 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                All caught up! No sync conflicts to resolve.
              </div>
            )}
            {(conflicts || []).map(c => (
              <div key={c.id} className="card p-6 border-l-4 border-l-danger border-danger/10">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-bold text-lg text-danger font-display tracking-tight">Conflict ID: {c.id}</h3>
                    <p className="text-sm text-stone-600 font-semibold uppercase tracking-wider mt-1">Model: <span className="text-primary">{c.model_name}</span> | Record: <span className="text-primary">{c.record_id}</span></p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 shadow-inner">
                    <h4 className="font-bold text-xs uppercase text-stone-500 mb-3 tracking-wider">Server Version</h4>
                    <pre className="text-xs overflow-auto text-ink/80 font-mono">{JSON.stringify(c.server_data, null, 2)}</pre>
                  </div>
                  <div className="p-4 bg-accent/5 rounded-lg border border-accent/20 shadow-inner">
                    <h4 className="font-bold text-xs uppercase text-accent mb-3 tracking-wider">Device Version (Conflict)</h4>
                    <pre className="text-xs overflow-auto text-ink/80 font-mono">{JSON.stringify(c.client_data, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'keep_server' })}
                    className="px-5 py-2.5 bg-stone-100 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-200 transition-colors">
                    Keep Server Version
                  </button>
                  <button onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'accept_client' })}
                    className="px-5 py-2.5 btn-gradient rounded-lg text-sm font-bold">
                    Accept Device Version
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
