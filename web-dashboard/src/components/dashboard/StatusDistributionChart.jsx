// src/components/dashboard/StatusDistributionChart.jsx
// Bar chart of nutritional status distribution — FR-064
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'

const COLOURS = { normal:'#22c55e', at_risk:'#fbbf24', mam:'#f97316', sam:'#ef4444', stunted:'#f59e0b', severely_stunted:'#dc2626', underweight:'#fb923c', unmeasured:'#d1d5db' }
const LABELS  = { normal:'Normal', at_risk:'At Risk', mam:'MAM', sam:'SAM', stunted:'Stunted', severely_stunted:'Sev.Stunted', underweight:'Underweight', unmeasured:'Unmeasured' }

export default function StatusDistributionChart({ data }) {
  if (!data) return null
  const chartData = Object.entries(data)
    .map(([status, count]) => ({ status: LABELS[status] || status, count, key: status }))
    .filter(d => d.count > 0)

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5">
      <h3 className="font-display font-semibold text-stone-900 mb-4">Nutritional status distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="status" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[4,4,0,0]}>
            {chartData.map((d, i) => <Cell key={i} fill={COLOURS[d.key] || '#6b7280'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
