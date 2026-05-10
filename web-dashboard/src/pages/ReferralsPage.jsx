import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { referralsApi, authenticatedDownload, resolveApiBase } from '../services/api'
import Header from '../components/layout/Header'

export default function ReferralsPage() {
  const [filterStatus, setFilterStatus] = useState('pending')
  const [downloading, setDownloading] = useState(null)

  const { data: referrals, isLoading, isError } = useQuery({
    queryKey: ['referrals', filterStatus],
    queryFn: () => referralsApi.list({ status: filterStatus === 'all' ? undefined : filterStatus }).then(r => r.data.results || r.data || []),
  })

  const handleDownload = async (id) => {
    setDownloading(id)
    try {
      await authenticatedDownload(`${resolveApiBase()}/referrals/${id}/slip.pdf`, `referral_${id}.pdf`)
    } catch (e) {
      alert(`Download failed: ${e.message}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Referrals Management" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200">
          <h2 className="font-bold text-lg text-ink font-display">Referral Follow-ups</h2>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border-stone-300 rounded-lg text-sm focus:ring-primary"
          >
            <option value="pending">Pending Referrals</option>
            <option value="completed">Completed Referrals</option>
            <option value="all">All Referrals</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-[3px] border-stone-300 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3 text-stone-500 text-sm">Loading referrals...</span>
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            Failed to load referrals. Please try again.
          </div>
        ) : !referrals || referrals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
            <h3 className="text-lg font-bold text-stone-600 mb-1">No Referrals Found</h3>
            <p className="text-sm text-stone-400">There are no {filterStatus} referrals at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {referrals.map(ref => {
              const date = new Date(ref.referral_date)
              const daysAgo = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
              const isOverdue = ref.status === 'pending' && daysAgo > 3

              return (
                <div key={ref.id} className={`card p-5 border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-teal-500'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${ref.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {ref.status}
                    </span>
                    {isOverdue && (
                      <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Overdue ({daysAgo} days)
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1">{ref.child_name || 'Unknown Child'}</h3>
                  <div className="space-y-2 text-sm text-stone-600 mb-4">
                    <p><span className="font-semibold text-stone-900">Date:</span> {date.toLocaleDateString()}</p>
                    <p><span className="font-semibold text-stone-900">Health Centre:</span> {ref.health_centre_name}</p>
                    <p><span className="font-semibold text-stone-900">Reason:</span> {ref.reason}</p>
                  </div>

                  <button
                    onClick={() => handleDownload(ref.id)}
                    disabled={downloading === ref.id}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {downloading === ref.id ? 'Downloading PDF...' : 'Download Referral Slip'}
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
