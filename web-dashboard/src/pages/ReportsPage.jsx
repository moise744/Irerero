// src/pages/ReportsPage.jsx
// P1: Authenticated downloads (no more 401)
// P2: Works for ALL roles including caregiver and centre_mgr
// P8: Full approval/submission workflow for Centre Manager
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, authenticatedDownload } from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function ReportsPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [notes, setNotes] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [generating, setGenerating] = useState(false)

  const isSectorOrAbove = ['sector', 'district', 'national', 'sys_admin'].includes(user?.role)
  const isCentreMgr = user?.role === 'centre_mgr'
  const isPartner = user?.role === 'partner'

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: () => reportsApi.monthly().then(r => r.data.results || r.data || []),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => reportsApi.approve(id, notes),
    onSuccess: () => { qc.invalidateQueries(['monthly-reports']); setApprovingId(null); setNotes('') },
  })

  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generate(),
    onSuccess: () => { qc.invalidateQueries(['monthly-reports']); setGenerating(false) },
    onError: () => setGenerating(false),
  })

  /** P1 Fix: Use authenticated download instead of plain <a href> */
  const handleDownload = async (url, filename) => {
    setDownloading(filename)
    try {
      await authenticatedDownload(url, filename)
    } catch (e) {
      alert(`Download failed: ${e.message}`)
    } finally {
      setDownloading(null)
    }
  }

  const STATUS_BADGE = {
    draft:     'bg-stone-100 text-stone-600',
    approved:  'bg-blue-500/10 text-blue-700',
    submitted: 'bg-brand-success/10 text-brand-success',
  }

  const reports = data || []

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Monthly Reports" />
      <div className="p-6 space-y-4">
        
        {/* Sector Coordinator+ PDF banner */}
        {isSectorOrAbove && (
          <div className="bg-primary rounded-2xl shadow-lg p-6 text-white flex justify-between items-center mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-xl font-display tracking-tight">Sector Aggregated Report</h3>
              <p className="text-white/80 text-sm mt-1">Download combined statistics for all centres in your jurisdiction.</p>
            </div>
            <button
              onClick={() => handleDownload(reportsApi.sectorPdfUrl(), 'sector_report.pdf')}
              disabled={downloading === 'sector_report.pdf'}
              className="relative z-10 px-5 py-2.5 bg-accent hover:bg-accent-light text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {downloading === 'sector_report.pdf' ? 'Downloading…' : 'Generate Sector PDF'}
            </button>
          </div>
        )}

        {/* P2 + P8: Centre Manager — Generate report button */}
        {(isCentreMgr || user?.role === 'caregiver' || user?.role === 'chw') && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl shadow-lg p-6 text-white flex justify-between items-center mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-xl font-display tracking-tight">
                {isCentreMgr ? 'Centre Monthly Report' : 'Centre Reports'}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {isCentreMgr
                  ? 'Generate, review, and submit the monthly report for your centre.'
                  : 'View monthly reports for your centre.'}
              </p>
            </div>
            {isCentreMgr && (
              <button
                onClick={() => { setGenerating(true); generateMutation.mutate() }}
                disabled={generating}
                className="relative z-10 px-5 py-2.5 bg-white text-teal-700 font-semibold rounded-lg shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {generating ? 'Generating…' : "Generate This Month's Report"}
              </button>
            )}
          </div>
        )}

        {/* Loading/Error states */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-[3px] border-stone-300 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3 text-stone-500 text-sm">Loading reports…</span>
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error?.response?.data?.detail || error.message}
            <button type="button" className="block mt-2 text-blue-700 underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}

        {/* P24: Empty state when no reports */}
        {!isLoading && !isError && reports.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-stone-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-bold text-stone-600 mb-1">No Reports Yet</h3>
            <p className="text-sm text-stone-400">
              {isCentreMgr
                ? 'Click "Generate This Month\'s Report" above to create your first monthly report.'
                : 'Monthly reports will appear here once they are generated by Centre Managers.'}
            </p>
          </div>
        )}
        
        {/* Report cards */}
        {!isLoading && !isError && reports.map(report => (
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
              <div className="flex gap-2 flex-wrap justify-end">
                {/* P1: Authenticated downloads */}
                <button
                  onClick={() => handleDownload(reportsApi.pdfUrl(report.id), `report_${report.year}_${report.month}.pdf`)}
                  disabled={!!downloading}
                  className="px-4 py-2 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 font-bold transition-colors disabled:opacity-50"
                >
                  {downloading === `report_${report.year}_${report.month}.pdf` ? 'Downloading…' : 'Download PDF'}
                </button>
                <button
                  onClick={() => handleDownload(reportsApi.csvUrl(report.id), `report_${report.year}_${report.month}.csv`)}
                  disabled={!!downloading}
                  className="px-4 py-2 bg-teal/10 text-teal text-sm rounded-lg hover:bg-teal/20 font-bold transition-colors disabled:opacity-50"
                >
                  {downloading === `report_${report.year}_${report.month}.csv` ? 'Downloading…' : 'Download CSV'}
                </button>
                {/* P8: Approve + Submit for Centre Manager */}
                {report.status === 'draft' && isCentreMgr && (
                  <button onClick={() => setApprovingId(report.id)}
                    className="px-4 py-2 btn-gradient text-white text-sm rounded-lg font-bold">
                    Approve and Submit
                  </button>
                )}
              </div>
            </div>
            {/* P8: Approval form */}
            {approvingId === report.id && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-sm font-semibold text-stone-700">Add manager notes before submitting to Sector Coordinator:</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add manager notes before submitting…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={3} />
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate({ id: report.id, notes })}
                    disabled={approveMutation.isLoading}
                    className="px-4 py-2 bg-brand-success text-white text-sm font-semibold rounded-lg hover:bg-brand-success/90 transition-colors disabled:opacity-50">
                    {approveMutation.isLoading ? 'Submitting…' : 'Submit to Sector Coordinator'}
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
