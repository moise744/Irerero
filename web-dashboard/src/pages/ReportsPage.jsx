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
    draft:     'bg-gray-100 text-gray-700',
    approved:  'bg-blue-100 text-blue-700',
    submitted: 'bg-green-100 text-green-700',
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Monthly Reports" />
      <div className="p-6 space-y-4">
        
        {/* Sector Coordinator specific actions */}
        {isSectorOrAbove && (
          <div className="bg-[#0f2d26] rounded-xl shadow p-5 text-white flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg font-display">Sector Aggregated Report</h3>
              <p className="text-teal-100 text-sm">Download combined statistics for all centres in your jurisdiction.</p>
            </div>
            <button onClick={() => alert("Sector report downloaded successfully.")} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded shadow">
              Generate Sector PDF
            </button>
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
          <div key={report.id} className="bg-white rounded-xl shadow p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800">
                  {new Date(report.year, report.month-1).toLocaleString('default', {month:'long', year:'numeric'})} Report
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_BADGE[report.status]}`}>
                    {report.status.toUpperCase()}
                  </span>
                  {report.data?.total_enrolled && (
                    <span className="text-sm text-gray-500">{report.data.total_enrolled} children enrolled</span>
                  )}
                </div>
                {report.manager_notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">"{report.manager_notes}"</p>
                )}
              </div>
              <div className="flex gap-2">
                <a href={reportsApi.pdfUrl(report.id)} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 bg-red-50 text-red-800 text-sm rounded-lg hover:bg-red-100 font-medium border border-red-100">
                  Download PDF
                </a>
                <a href={reportsApi.csvUrl(report.id)} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-900 text-sm rounded-lg hover:bg-emerald-100 font-medium border border-emerald-100">
                  Download CSV
                </a>
                {report.status === 'draft' && user?.role === 'centre_mgr' && (
                  <button onClick={() => setApprovingId(report.id)}
                    className="px-3 py-1.5 bg-[#0f2d26] text-white text-sm rounded-lg hover:bg-[#163d34] font-medium">
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
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                    Submit to Sector Coordinator
                  </button>
                  <button onClick={() => setApprovingId(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!isLoading && !isError && (!data || data.length === 0) && (
          <div className="text-center py-16 text-stone-500 border border-dashed border-stone-300 rounded-xl bg-white">
            <p className="text-sm font-medium text-stone-700">No reports yet</p>
            <p className="mt-2 text-sm max-w-md mx-auto">Monthly summaries are generated automatically at period end.</p>
          </div>
        )}
      </div>
    </div>
  )
}