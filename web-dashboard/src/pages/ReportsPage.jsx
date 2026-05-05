// src/pages/ReportsPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function ReportsPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [notes, setNotes] = useState('')
  const [approvingId, setApprovingId] = useState(null)

  const isSectorOrAbove = ['sector', 'district', 'national', 'sys_admin'].includes(user?.role)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: () => reportsApi.monthly().then(r => r.data.results || r.data || []),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => reportsApi.approve(id, notes),
    onSuccess: () => { qc.invalidateQueries(['monthly-reports']); setApprovingId(null); setNotes('') },
  })

  const STATUS_BADGE = {
    draft:     'bg-stone-100 text-stone-600',
    approved:  'bg-blue-500/10 text-blue-700',
    submitted: 'bg-brand-success/10 text-brand-success',
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Monthly Reports" />
      <div className="p-6 space-y-4">
        
        {/* Sector Coordinator specific actions */}
        {isSectorOrAbove && (
          <div className="bg-primary rounded-2xl shadow-lg p-6 text-white flex justify-between items-center mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-xl font-display tracking-tight">Sector Aggregated Report</h3>
              <p className="text-white/80 text-sm mt-1">Download combined statistics for all centres in your jurisdiction.</p>
            </div>
            {/* Wired the button to the real API endpoint */}
            <a href={reportsApi.sectorPdfUrl()} target="_blank" rel="noreferrer" className="relative z-10 px-5 py-2.5 bg-accent hover:bg-accent-light text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:-translate-y-0.5">
              Generate Sector PDF
            </a>
          </div>
        )}

        {isLoading && <p className="text-gray-500">Loading reports…</p>}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error?.response?.data?.detail || error.message}
            <button type="button" className="block mt-2 text-blue-700 underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        
        {!isLoading && !isError && (data || []).map(report => (
          <div key={report.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xl text-ink font-display tracking-tight">
                  {new Date(report.year, report.month-1).toLocaleString('default', {month:'long', year:'numeric'})} Report
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${STATUS_BADGE[report.status]}`}>
                    {report.status}
                  </span>
                  {report.data?.total_enrolled && (
                    <span className="text-sm font-semibold text-stone-500">{report.data.total_enrolled} children enrolled</span>
                  )}
                </div>
                {report.manager_notes && (
                  <p className="text-sm text-stone-600 mt-3 italic border-l-2 border-stone-200 pl-3">"{report.manager_notes}"</p>
                )}
              </div>
              <div className="flex gap-2">
                <a href={reportsApi.pdfUrl(report.id)} target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 font-bold transition-colors">
                  Download PDF
                </a>
                <a href={reportsApi.csvUrl(report.id)} target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-teal/10 text-teal text-sm rounded-lg hover:bg-teal/20 font-bold transition-colors">
                  Download CSV
                </a>
                {report.status === 'draft' && user?.role === 'centre_mgr' && (
                  <button onClick={() => setApprovingId(report.id)}
                    className="px-4 py-2 btn-gradient text-white text-sm rounded-lg font-bold">
                    Approve and submit
                  </button>
                )}
              </div>
            </div>
            {approvingId === report.id && (
              <div className="mt-4 space-y-3">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add manager notes before submitting…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={3} />
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate({ id: report.id, notes })}
                    className="px-4 py-2 bg-brand-success text-white text-sm font-semibold rounded-lg hover:bg-brand-success/90 transition-colors">
                    Submit to Sector Coordinator
                  </button>
                  <button onClick={() => setApprovingId(null)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 text-sm font-semibold rounded-lg hover:bg-stone-200 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}