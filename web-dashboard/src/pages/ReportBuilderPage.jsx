// src/pages/ReportBuilderPage.jsx
// P21: Custom report builder for National Administrator
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { authenticatedDownload } from '../services/api'
import { resolveApiBase } from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function ReportBuilderPage() {
  const user = useAuthStore(s => s.user)
  const isNationalOrAdmin = ['national', 'sys_admin'].includes(user?.role)

  const [params, setParams] = useState({
    report_type: 'nutritional_summary',
    time_period: 'this_month',
    age_group: 'all',
    sex: 'all',
    district: 'all',
    format: 'table',
  })
  const [generated, setGenerated] = useState(false)

  const { data: sdgData } = useQuery({
    queryKey: ['sdg-indicators'],
    queryFn: () => api.get('/reports/sdg-indicators/').then(r => r.data),
    enabled: isNationalOrAdmin,
  })

  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['report-builder', params],
    queryFn: () => api.get('/reports/dashboards/national/', { params }).then(r => r.data),
    enabled: generated && isNationalOrAdmin,
  })

  if (!isNationalOrAdmin) {
    return <div className="p-8 text-center text-stone-500">Access restricted to National Administrator and SysAdmin.</div>
  }

  const handleGenerate = () => {
    setGenerated(true)
    refetch()
  }

  const REPORT_TYPES = [
    { value: 'nutritional_summary', label: 'Nutritional Status Summary' },
    { value: 'attendance_overview', label: 'Attendance Overview' },
    { value: 'referral_tracking', label: 'Referral Tracking' },
    { value: 'sdg_progress', label: 'SDG Progress Indicators' },
    { value: 'centre_comparison', label: 'Centre-by-Centre Comparison' },
  ]

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Custom Report Builder" />
      <div className="p-6 space-y-6">

        {/* Builder form */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-xl text-ink mb-4">Build Your Report</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wide">Report Type</label>
              <select value={params.report_type} onChange={e => setParams({...params, report_type: e.target.value})}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:ring-2 focus:ring-primary/20 outline-none">
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wide">Time Period</label>
              <select value={params.time_period} onChange={e => setParams({...params, time_period: e.target.value})}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wide">Age Group</label>
              <select value={params.age_group} onChange={e => setParams({...params, age_group: e.target.value})}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="all">All Ages</option>
                <option value="0-6m">0–6 months</option>
                <option value="6-24m">6–24 months</option>
                <option value="2-5y">2–5 years</option>
                <option value="5-8y">5–8 years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wide">Gender</label>
              <select value={params.sex} onChange={e => setParams({...params, sex: e.target.value})}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="all">All</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wide">District</label>
              <select value={params.district} onChange={e => setParams({...params, district: e.target.value})}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="all">All Districts</option>
                <option value="gasabo">Gasabo</option>
                <option value="kicukiro">Kicukiro</option>
                <option value="nyarugenge">Nyarugenge</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleGenerate} disabled={isLoading}
                className="w-full px-5 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50">
                {isLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* SDG Progress Cards */}
        {sdgData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 border-l-4 border-l-amber-500">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">SDG 2 — Zero Hunger</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm"><span>Stunting Rate</span><span className="font-bold">{sdgData.sdg2_zero_hunger?.stunting_rate_percent}%</span></div>
                <div className="flex justify-between text-sm"><span>Wasting Rate</span><span className="font-bold">{sdgData.sdg2_zero_hunger?.wasting_rate_percent}%</span></div>
              </div>
            </div>
            <div className="card p-5 border-l-4 border-l-emerald-500">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">SDG 3 — Good Health</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm"><span>Immunization</span><span className="font-bold">{sdgData.sdg3_good_health?.fully_immunized_percent}%</span></div>
                <div className="flex justify-between text-sm"><span>Referral Completion</span><span className="font-bold">{sdgData.sdg3_good_health?.referral_completion_percent}%</span></div>
              </div>
            </div>
            <div className="card p-5 border-l-4 border-l-blue-500">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">SDG 4 — Quality Education</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm"><span>ECD Attendance Rate</span><span className="font-bold">{sdgData.sdg4_quality_education?.ecd_attendance_rate_percent}%</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {generated && dashData && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ink">
                {REPORT_TYPES.find(t => t.value === params.report_type)?.label || 'Report'} Results
              </h3>
              <button
                onClick={() => authenticatedDownload(`${resolveApiBase()}/reports/sector/report.pdf`, 'custom_report.pdf')}
                className="px-4 py-2 bg-danger/10 text-danger text-sm rounded-lg hover:bg-danger/20 font-bold transition-colors"
              >
                Export PDF
              </button>
            </div>
            <div className="rounded-lg border border-stone-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr className="text-stone-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Metric</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr><td className="px-4 py-3 font-medium">Total Centres</td><td className="px-4 py-3 text-right tabular-nums font-bold">{dashData.total_centres || 0}</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Total Children Enrolled</td><td className="px-4 py-3 text-right tabular-nums font-bold">{dashData.total_children || 0}</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Report Type</td><td className="px-4 py-3 text-right capitalize">{params.report_type.replace(/_/g, ' ')}</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Period</td><td className="px-4 py-3 text-right capitalize">{params.time_period.replace(/_/g, ' ')}</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Age Group</td><td className="px-4 py-3 text-right">{params.age_group === 'all' ? 'All Ages' : params.age_group}</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Gender Filter</td><td className="px-4 py-3 text-right capitalize">{params.sex === 'all' ? 'Both' : params.sex}</td></tr>
                  {dashData.filters_available && (
                    <tr><td className="px-4 py-3 font-medium">Available Filters</td><td className="px-4 py-3 text-right text-xs">{dashData.filters_available.join(', ')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generated && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-stone-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-bold text-stone-600 mb-1">Build a Custom Report</h3>
            <p className="text-sm text-stone-400">Select your parameters above and click "Generate" to create a custom report.</p>
          </div>
        )}
      </div>
    </div>
  )
}
