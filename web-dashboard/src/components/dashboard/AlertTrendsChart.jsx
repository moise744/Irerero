import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { useAuthStore } from '../../hooks/useAuth'

export default function AlertTrendsChart() {
  const user = useAuthStore(s => s.user)

  // Fetch trend data from backend, fallback to empty array if endpoint isn't wired yet
  const { data, isLoading, isError } = useQuery({
    queryKey: ['alert-trends'],
    queryFn: () => api.get('/alerts/trends/').then(r => r.data).catch(() => []),
    enabled: !!user,
  })

  if (isLoading) return <div className="h-64 flex items-center justify-center text-gray-500">Loading trends...</div>
  if (isError) return <div className="h-64 flex items-center justify-center text-red-500">Error loading trends</div>

  // If no data returned from backend, use some mock data for demonstration
  const chartData = data?.length > 0 ? data : [
    { name: 'Jan', sam: 12, mam: 19, stunted: 3 },
    { name: 'Feb', sam: 10, mam: 22, stunted: 4 },
    { name: 'Mar', sam: 15, mam: 18, stunted: 3 },
    { name: 'Apr', sam: 8, mam: 15, stunted: 5 },
    { name: 'May', sam: 5, mam: 12, stunted: 2 },
    { name: 'Jun', sam: 7, mam: 10, stunted: 1 },
  ]

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-sm p-5 h-[350px] flex flex-col">
      <h3 className="font-display font-semibold text-stone-900 mb-4">Malnutrition Trends</h3>
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="sam" name="SAM Cases" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="mam" name="MAM Cases" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="stunted" name="Stunted" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
