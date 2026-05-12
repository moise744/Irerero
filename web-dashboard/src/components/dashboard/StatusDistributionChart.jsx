// Bar chart of nutritional status distribution — FR-064
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'

const COLOURS = {
  normal: '#3DAF8A',
  at_risk: '#F5A462',
  mam: '#E8573A',
  sam: '#E8573A',
  stunted: '#F5A462',
  severely_stunted: '#C94A32',
  underweight: '#F5A462',
  unmeasured: '#C8C8B8',
}
const LABELS = {
  normal: 'Normal',
  at_risk: 'At Risk',
  mam: 'MAM',
  sam: 'SAM',
  stunted: 'Stunted',
  severely_stunted: 'Sev.Stunted',
  underweight: 'Underweight',
  unmeasured: 'Unmeasured',
}

export default function StatusDistributionChart({ data, title = 'Nutritional status distribution' }) {
  if (!data) return null
  const chartData = Object.entries(data)
    .map(([status, count]) => ({ status: LABELS[status] || status, count, key: status }))
    .filter(d => d.count > 0)

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-ink-display tracking-wide mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" vertical={false} />
          <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#4A4A3F' }} axisLine={{ stroke: '#E8E4DC' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#4A4A3F' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E8E4DC',
              backgroundColor: '#FFFBF7',
              boxShadow: 'none',
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={COLOURS[d.key] || '#7A7A6E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
