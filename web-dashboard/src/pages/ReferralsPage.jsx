import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { referralsApi, authenticatedDownload, resolveApiBase } from '../services/api'
import Header from '../components/layout/Header'
import { useFlashMessage } from '../hooks/useFlashMessage'
import FlashBanner from '../components/ui/FlashBanner'

export default function ReferralsPage() {
  const [filterStatus, setFilterStatus] = useState('pending')
  const [downloading, setDownloading] = useState(null)
  const { flash, success, error } = useFlashMessage()

  const { data: referrals, isLoading, isError } = useQuery({
    queryKey: ['referrals', filterStatus],
    queryFn: () =>
      referralsApi.list({ status: filterStatus === 'all' ? undefined : filterStatus }).then(r => r.data.results || r.data || []),
  })

  const handleDownload = async id => {
    setDownloading(id)
    try {
      await authenticatedDownload(`${resolveApiBase()}/referrals/${id}/slip.pdf`, `referral_${id}.pdf`)
      success('Referral slip downloaded successfully.')
    } catch (e) {
      error(`Download failed: ${e.message}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Referrals Management" />
      <div className="p-6 md:p-8 space-y-8">
        <FlashBanner flash={flash} />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 card p-6">
          <h2 className="font-bold text-lg text-ink-display font-display tracking-wide">Referral follow-ups</h2>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-field w-full sm:w-auto min-w-[12rem]"
          >
            <option value="pending">Pending referrals</option>
            <option value="completed">Completed referrals</option>
            <option value="all">All referrals</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner-ring" />
            <span className="ml-3 text-ink-muted text-sm font-medium">Loading referrals…</span>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border-[1.5px] border-coral bg-surface-blush p-4 text-ink text-sm">Failed to load referrals. Please try again.</div>
        ) : !referrals || referrals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border-warm p-12 text-center bg-surface-card/80">
            <h3 className="text-lg font-bold text-ink-display font-display tracking-wide mb-1">No referrals found</h3>
            <p className="text-sm text-ink-muted leading-relaxed">There are no {filterStatus} referrals at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {referrals.map(ref => {
              const date = new Date(ref.referral_date)
              const daysAgo = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
              const isOverdue = ref.status === 'pending' && daysAgo > 3

              return (
                <div key={ref.id} className={`card p-6 border-l-4 ${isOverdue ? 'border-l-coral' : 'border-l-sage'}`}>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize border ${
                        ref.status === 'pending'
                          ? 'bg-surface-cream text-amber border-amber/30'
                          : 'bg-surface-mint/90 text-forest border-sage/30'
                      }`}
                    >
                      {ref.status}
                    </span>
                    {isOverdue && (
                      <span className="text-xs font-semibold text-coral flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Overdue ({daysAgo} days)
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg mb-2 text-ink-display font-display tracking-wide">{ref.child_name || 'Unknown child'}</h3>
                  <div className="space-y-2 text-sm text-ink-muted mb-5 leading-relaxed">
                    <p>
                      <span className="font-semibold text-forest">Date:</span> {date.toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-semibold text-forest">Health centre:</span> {ref.health_centre_name}
                    </p>
                    <p>
                      <span className="font-semibold text-forest">Reason:</span> {ref.reason}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(ref.id)}
                    disabled={downloading === ref.id}
                    className="w-full py-2.5 rounded-lg border-[1.5px] border-border-warm bg-canvas hover:bg-surface-blush/50 text-ink text-sm font-semibold transition-colors duration-200 disabled:opacity-50"
                  >
                    {downloading === ref.id ? 'Downloading PDF…' : 'Download referral slip'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
