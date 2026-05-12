// src/components/charts/GrowthChart.jsx
// Individual child growth chart — WHO P3/P15/P50/P85/P97 reference lines — FR-024

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { childrenApi } from '../../services/api'

const WHO_COLOURS = { p3: '#E8573A', p15: '#F5A462', p50: '#3DAF8A', p85: '#F5A462', p97: '#E8573A' }

export default function GrowthChart({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['growth-chart', childId],
    queryFn: () => childrenApi.growthChart(childId).then(r => r.data),
    enabled: !!childId,
  })

  if (isLoading) return <div className="h-64 flex items-center justify-center text-ink-muted text-sm">Loading chart…</div>
  if (!data) return <div className="h-48 flex items-center justify-center text-ink-muted bg-surface-card rounded-2xl border border-border-subtle">No chart data.</div>

  const series = Array.isArray(data.weight_series) ? data.weight_series : []
  if (series.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-muted">
        <p className="font-semibold text-ink-display">No weight measurements yet</p>
        <p className="text-sm mt-2 leading-relaxed">Record at least one weight on mobile or seed demo data to see the growth curve.</p>
      </div>
    )
  }

  const chartData = series.map(p => ({ date: p.date, weight: p.value, status: p.nutritional_status }))
  const trend = data.trend_projection || []

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-ink-display tracking-wide mb-1">Growth — {data.child_name}</h3>
      <p className="text-xs text-ink-muted mb-4 leading-relaxed">Weight-for-age with WHO P3/P15/P50/P85/P97 reference lines</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4A4A3F' }} />
          <YAxis tick={{ fontSize: 11, fill: '#4A4A3F' }} label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#4A4A3F' }} />
          <Tooltip
            formatter={(v, n) => [`${v} kg`, n]}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E8E4DC',
              backgroundColor: '#FFFBF7',
              boxShadow: 'none',
            }}
          />
          <Legend />
          {Object.entries(WHO_COLOURS).map(([p, colour]) => (
            <ReferenceLine
              key={p}
              y={data.who_reference?.[p]?.[6] || 0}
              stroke={colour}
              strokeDasharray="4 2"
              strokeOpacity={0.55}
              label={{ value: p.toUpperCase(), position: 'right', fontSize: 10, fill: colour }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#2D6B4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2D6B4F' }}
            activeDot={{ r: 6 }}
            name="Child weight"
          />
          {trend.length > 0 && (
            <Line
              type="monotone"
              data={trend.map(t => ({ date: 'projected', weight: t.value }))}
              dataKey="weight"
              stroke="#7A7A6E"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              dot={false}
              name="Trend projection"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
