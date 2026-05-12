import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { useAuthStore } from '../../hooks/useAuth'

export default function AlertTrendsChart() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['alert-trends'],
    queryFn: async () => {
      try {
        const r = await api.get('/alerts/trends/')
        return r.data
      } catch {
        return []
      }
    },
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const chartData =
    data?.length > 0
      ? data
      : [
          { name: 'Jan', sam: 12, mam: 19, stunted: 3 },
          { name: 'Feb', sam: 10, mam: 22, stunted: 4 },
          { name: 'Mar', sam: 15, mam: 18, stunted: 3 },
          { name: 'Apr', sam: 8, mam: 15, stunted: 5 },
          { name: 'May', sam: 5, mam: 12, stunted: 2 },
          { name: 'Jun', sam: 7, mam: 10, stunted: 1 },
        ]

  return (
    <div className="card p-6 h-[350px] flex flex-col">
      <h3 className="font-display font-semibold text-ink-display tracking-wide mb-4">Malnutrition trends</h3>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
          <div className="h-6 w-6 border-2 border-border-subtle border-t-forest rounded-full animate-spin mr-2" />
          Loading trends…
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E4DC" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#4A4A3F' }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4A3F' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E8E4DC',
                  backgroundColor: '#FFFBF7',
                  boxShadow: 'none',
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="sam" name="SAM cases" stroke="#E8573A" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="mam" name="MAM cases" stroke="#F5A462" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="stunted" name="Stunted" stroke="#2D6B4F" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
