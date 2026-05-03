// src/components/charts/GrowthChart.jsx
// Individual child growth chart — WHO P3/P15/P50/P85/P97 reference lines — FR-024
// Recharts line chart, click-through, hover tooltips — FR-067

import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer
} from 'recharts'
import { childrenApi } from '../../services/api'

const WHO_COLOURS = { p3:'#ef4444', p15:'#f97316', p50:'#22c55e', p85:'#f97316', p97:'#ef4444' }

export default function GrowthChart({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['growth-chart', childId],
    queryFn:  () => childrenApi.growthChart(childId).then(r => r.data),
    enabled:  !!childId,
  })

  if (isLoading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading chart…</div>
  if (!data) return <div className="h-48 flex items-center justify-center text-gray-400 bg-white rounded-xl shadow">No chart data.</div>

  const series = Array.isArray(data.weight_series) ? data.weight_series : []
  if (series.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        <p className="font-medium text-gray-700">No weight measurements yet</p>
        <p className="text-sm mt-2">Record at least one weight on mobile or seed demo data to see the growth curve.</p>
      </div>
    )
  }

  const chartData = series.map(p => ({ date: p.date, weight: p.value, status: p.nutritional_status }))
  const trend     = data.trend_projection || []

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-display font-semibold text-gray-800 mb-1">Growth — {data.child_name}</h3>
      <p className="text-xs text-gray-500 mb-4">Weight-for-age with WHO P3/P15/P50/P85/P97 reference lines</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [`${v} kg`, n]} />
          <Legend />
          {/* WHO percentile reference lines */}
          {Object.entries(WHO_COLOURS).map(([p, colour]) => (
            <ReferenceLine key={p} y={data.who_reference?.[p]?.[6] || 0}
              stroke={colour} strokeDasharray="4 2" strokeOpacity={0.5}
              label={{ value: p.toUpperCase(), position: 'right', fontSize: 10, fill: colour }} />
          ))}
          <Line type="monotone" dataKey="weight" stroke="#1F3A6B" strokeWidth={2.5}
            dot={{ r: 5, fill: '#1F3A6B' }} activeDot={{ r: 7 }}
            name="Child Weight" />
          {trend.length > 0 && (
            <Line type="monotone" data={trend.map(t => ({ date: 'projected', weight: t.value }))}
              dataKey="weight" stroke="#9ca3af" strokeDasharray="6 3" strokeWidth={1.5}
              dot={false} name="Trend Projection" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
