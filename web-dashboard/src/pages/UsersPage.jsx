// src/pages/UsersPage.jsx — FR-007 sys admin user list (click-safe navigation target for sidebar)
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function UsersPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'sys_admin'

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users-admin'],
    queryFn: () => api.get('/users/').then(r => r.data),
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Users" />
        <div className="p-8 text-center text-gray-600">
          <p className="font-medium text-gray-800">Access restricted</p>
          <p className="text-sm mt-2">Sign in as <strong>admin</strong> to manage users.</p>
        </div>
      </div>
    )
  }

  const rows = Array.isArray(data) ? data : []

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Users (SysAdmin)" />
      <div className="p-6">
        {isLoading && <p className="text-gray-500">Loading users…</p>}
        {isError && (
          <p className="text-red-600 text-sm">{error?.response?.data?.detail || error.message}</p>
        )}
        {!isLoading && !isError && (
          <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-100 text-stone-700 text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 font-mono">{u.username}</td>
                    <td className="px-4 py-2">{u.full_name}</td>
                    <td className="px-4 py-2">{u.role_display || u.role}</td>
                    <td className="px-4 py-2">{u.is_active ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="p-8 text-center text-gray-400">No users returned.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
