// src/pages/ReportsPage.jsx
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: () => reportsApi.monthly().then(r => r.data.results || r.data || []),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => reportsApi.approve(id, notes),
    onSuccess: () => {
      qc.invalidateQueries(['monthly-reports'])
      setApprovingId(null)
      setNotes('')
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generate(),
    onSuccess: () => {
      qc.invalidateQueries(['monthly-reports'])
      setGenerating(false)
    },
    onError: () => setGenerating(false),
  })

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
    draft: 'bg-surface-cream text-amber border border-amber/30',
    approved: 'bg-surface-mint/80 text-forest border border-sage/30',
    submitted: 'bg-surface-mint/90 text-forest border border-sage/30',
  }

  const reports = data || []

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Monthly Reports" />
      <div className="p-6 md:p-8 space-y-8 max-w-[1200px]">
        {isSectorOrAbove && (
          <div className="card p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-l-4 border-l-forest bg-surface-mint/25">
            <div>
              <h3 className="font-bold text-xl font-display text-ink-display tracking-wide">Sector aggregated report</h3>
              <p className="text-ink-muted text-sm mt-2 leading-relaxed max-w-xl">
                Download combined statistics for all centres in your jurisdiction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(reportsApi.sectorPdfUrl(), 'sector_report.pdf')}
              disabled={downloading === 'sector_report.pdf'}
              className="btn-primary shrink-0"
            >
              {downloading === 'sector_report.pdf' ? 'Downloading…' : 'Generate sector PDF'}
            </button>
          </div>
        )}

        {(isCentreMgr || user?.role === 'caregiver' || user?.role === 'chw') && (
          <div className="card p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-l-4 border-l-coral bg-surface-blush/40">
            <div>
              <h3 className="font-bold text-xl font-display text-ink-display tracking-wide">
                {isCentreMgr ? 'Centre monthly report' : 'Centre reports'}
              </h3>
              <p className="text-ink-muted text-sm mt-2 leading-relaxed max-w-xl">
                {isCentreMgr
                  ? 'Generate, review, and submit the monthly report for your centre.'
                  : 'View monthly reports for your centre.'}
              </p>
            </div>
            {isCentreMgr && (
              <button
                type="button"
                onClick={() => {
                  setGenerating(true)
                  generateMutation.mutate()
                }}
                disabled={generating}
                className="btn-secondary shrink-0"
              >
                {generating ? 'Generating…' : "Generate this month's report"}
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="spinner-ring" />
            <span className="ml-3 text-ink-muted text-sm font-medium">Loading reports…</span>
          </div>
        )}
        {isError && (
          <div className="rounded-2xl border-[1.5px] border-coral bg-surface-blush p-4 text-ink text-sm leading-relaxed">
            {error?.response?.data?.detail || error.message}
            <button type="button" className="block mt-3 text-forest font-semibold hover:text-coral transition-colors" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && reports.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border-warm p-12 text-center bg-surface-card/80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-ink-placeholder mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-bold text-ink-display font-display tracking-wide mb-1">No reports yet</h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-md mx-auto">
              {isCentreMgr
                ? 'Use “Generate this month’s report” above to create your first monthly report.'
                : 'Monthly reports will appear here once they are generated by centre managers.'}
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          reports.map(report => (
            <div key={report.id} className="card p-8">
              <div className="flex items-start justify-between flex-col lg:flex-row gap-4">
                <div>
                  <h3 className="font-bold text-xl text-ink-display font-display tracking-wide">
                    {new Date(report.year, report.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}{' '}
                    report
                  </h3>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold tracking-wide ${STATUS_BADGE[report.status]}`}>
                      {report.status}
                    </span>
                    {report.data?.total_enrolled && (
                      <span className="text-sm font-semibold text-ink-muted">{report.data.total_enrolled} children enrolled</span>
                    )}
                  </div>
                  {report.manager_notes && (
                    <p className="text-sm text-ink-muted mt-4 italic border-l-2 border-sage/50 pl-3 leading-relaxed">
                      &ldquo;{report.manager_notes}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownload(reportsApi.pdfUrl(report.id), `report_${report.year}_${report.month}.pdf`)}
                    disabled={!!downloading}
                    className="px-4 py-2.5 bg-surface-blush text-coral text-sm rounded-lg hover:bg-surface-blush/80 font-semibold border border-coral/25 transition-colors duration-200 disabled:opacity-50"
                  >
                    {downloading === `report_${report.year}_${report.month}.pdf` ? 'Downloading…' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(reportsApi.csvUrl(report.id), `report_${report.year}_${report.month}.csv`)}
                    disabled={!!downloading}
                    className="px-4 py-2.5 bg-surface-mint/80 text-forest text-sm rounded-lg hover:bg-surface-mint font-semibold border border-sage/30 transition-colors duration-200 disabled:opacity-50"
                  >
                    {downloading === `report_${report.year}_${report.month}.csv` ? 'Downloading…' : 'Download CSV'}
                  </button>
                  {report.status === 'draft' && isCentreMgr && (
                    <button type="button" onClick={() => setApprovingId(report.id)} className="btn-primary px-4">
                      Approve and submit
                    </button>
                  )}
                </div>
              </div>
              {approvingId === report.id && (
                <div className="mt-6 space-y-3 border-t border-border-subtle pt-6">
                  <p className="text-sm font-semibold text-forest">Add manager notes before submitting to sector coordinator:</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add manager notes before submitting…"
                    className="input-field"
                    rows={3}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate({ id: report.id, notes })}
                      disabled={approveMutation.isPending}
                      className="btn-secondary px-4 disabled:opacity-50"
                    >
                      {approveMutation.isPending ? 'Submitting…' : 'Submit to sector coordinator'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovingId(null)}
                      className="px-4 py-2.5 rounded-lg border-[1.5px] border-border-warm text-ink text-sm font-semibold hover:bg-surface-blush transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
