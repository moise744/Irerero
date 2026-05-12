// src/pages/ReportBuilderPage.jsx
// P21: Custom report builder for National Administrator
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { authenticatedDownload, resolveApiBase } from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import FlashBanner from '../components/ui/FlashBanner'

export default function ReportBuilderPage() {
  const user = useAuthStore(s => s.user)
  const isNationalOrAdmin = ['national', 'sys_admin'].includes(user?.role)
  const { flash, success, error } = useFlashMessage()

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
    return (
      <div className="p-8 text-center text-ink-muted bg-canvas min-h-[40vh] flex items-center justify-center leading-relaxed">
        Access restricted to National Administrator and SysAdmin.
      </div>
    )
  }

  const handleGenerate = () => {
    setGenerated(true)
    window.setTimeout(async () => {
      try {
        const res = await refetch()
        if (res.isError) {
          error(res.error?.message || 'Could not load report data. Try again.')
          return
        }
        success('Report generated with your selected filters.')
      } catch (e) {
        error(e?.message || 'Could not load report.')
      }
    }, 0)
  }

  const handleExportPdf = async () => {
    try {
      await authenticatedDownload(`${resolveApiBase()}/reports/sector/report.pdf`, 'custom_report.pdf')
      success('Report exported successfully.')
    } catch (e) {
      error(`Export failed: ${e.message}`)
    }
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
        <FlashBanner flash={flash} />
        <div className="card p-6">
          <h3 className="font-display font-bold text-xl text-ink-display tracking-wide mb-6">Build your report</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="field-label">Report type</label>
              <select value={params.report_type} onChange={e => setParams({...params, report_type: e.target.value})}
                className="input-field">
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Time period</label>
              <select value={params.time_period} onChange={e => setParams({...params, time_period: e.target.value})}
                className="input-field">
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
              </select>
            </div>
            <div>
              <label className="field-label">Age group</label>
              <select value={params.age_group} onChange={e => setParams({...params, age_group: e.target.value})}
                className="input-field">
                <option value="all">All Ages</option>
                <option value="0-6m">0–6 months</option>
                <option value="6-24m">6–24 months</option>
                <option value="2-5y">2–5 years</option>
                <option value="5-8y">5–8 years</option>
              </select>
            </div>
            <div>
              <label className="field-label">Gender</label>
              <select value={params.sex} onChange={e => setParams({...params, sex: e.target.value})}
                className="input-field">
                <option value="all">All</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
              </select>
            </div>
            <div>
              <label className="field-label">District</label>
              <select value={params.district} onChange={e => setParams({...params, district: e.target.value})}
                className="input-field">
                <option value="all">All Districts</option>
                <option value="gasabo">Gasabo</option>
                <option value="kicukiro">Kicukiro</option>
                <option value="nyarugenge">Nyarugenge</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" onClick={handleGenerate} disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50">
                {isLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* SDG Progress Cards */}
        {sdgData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6 border-l-4 border-l-amber">
              <h4 className="text-xs font-semibold text-forest tracking-wide">SDG 2 — Zero hunger</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm text-ink"><span>Stunting rate</span><span className="font-semibold text-ink-display">{sdgData.sdg2_zero_hunger?.stunting_rate_percent}%</span></div>
                <div className="flex justify-between text-sm text-ink"><span>Wasting rate</span><span className="font-semibold text-ink-display">{sdgData.sdg2_zero_hunger?.wasting_rate_percent}%</span></div>
              </div>
            </div>
            <div className="card p-6 border-l-4 border-l-sage">
              <h4 className="text-xs font-semibold text-forest tracking-wide">SDG 3 — Good health</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm text-ink"><span>Immunization</span><span className="font-semibold text-ink-display">{sdgData.sdg3_good_health?.fully_immunized_percent}%</span></div>
                <div className="flex justify-between text-sm text-ink"><span>Referral completion</span><span className="font-semibold text-ink-display">{sdgData.sdg3_good_health?.referral_completion_percent}%</span></div>
              </div>
            </div>
            <div className="card p-6 border-l-4 border-l-forest">
              <h4 className="text-xs font-semibold text-forest tracking-wide">SDG 4 — Quality education</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm text-ink"><span>ECD attendance rate</span><span className="font-semibold text-ink-display">{sdgData.sdg4_quality_education?.ecd_attendance_rate_percent}%</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {generated && dashData && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ink-display tracking-wide">
                {REPORT_TYPES.find(t => t.value === params.report_type)?.label || 'Report'} results
              </h3>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2 bg-surface-blush text-coral text-sm rounded-lg hover:bg-surface-blush/80 font-semibold border border-coral/20 transition-colors"
              >
                Export PDF
              </button>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm table-standard">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Metric</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-surface-card">
                  <tr><td className="px-4 py-3 font-medium text-ink">Total Centres</td><td className="px-4 py-3 text-right tabular-nums font-semibold text-ink-display">{dashData.total_centres || 0}</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-ink">Total Children Enrolled</td><td className="px-4 py-3 text-right tabular-nums font-semibold text-ink-display">{dashData.total_children || 0}</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-ink">Report Type</td><td className="px-4 py-3 text-right capitalize text-ink-muted">{params.report_type.replace(/_/g, ' ')}</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-ink">Period</td><td className="px-4 py-3 text-right capitalize text-ink-muted">{params.time_period.replace(/_/g, ' ')}</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-ink">Age Group</td><td className="px-4 py-3 text-right text-ink-muted">{params.age_group === 'all' ? 'All Ages' : params.age_group}</td></tr>
                  <tr><td className="px-4 py-3 font-medium text-ink">Gender Filter</td><td className="px-4 py-3 text-right capitalize text-ink-muted">{params.sex === 'all' ? 'Both' : params.sex}</td></tr>
                  {dashData.filters_available && (
                    <tr><td className="px-4 py-3 font-medium text-ink">Available Filters</td><td className="px-4 py-3 text-right text-xs text-ink-muted">{dashData.filters_available.join(', ')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generated && (
          <div className="rounded-2xl border-2 border-dashed border-border-warm p-12 text-center bg-surface-card/80">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-ink-placeholder mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-bold text-ink-display font-display tracking-wide mb-1">Build a custom report</h3>
            <p className="text-sm text-ink-muted leading-relaxed">Select your parameters above and click Generate to create a custom report.</p>
          </div>
        )}
      </div>
    </div>
  )
}
