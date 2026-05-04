// src/pages/UsersPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function UsersPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'sys_admin'
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-admin'],
    queryFn: () => api.get('/users/').then(r => r.data),
    enabled: isAdmin,
  })

  const wipeMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/wipe/`),
    onSuccess: () => {
      alert('Remote wipe scheduled for device on next sync.')
      qc.invalidateQueries(['users-admin'])
    }
  })

  const mlMutation = useMutation({
    mutationFn: () => api.post('/ai/retrain/'),
    onSuccess: (data) => alert(`ML Model Retrained Successfully!\nSensitivity: ${data.data.sensitivity_achieved}%`)
  })

  if (!isAdmin) return <div className="p-8 text-center">Access Restricted to SysAdmin.</div>

  return (
    <div className="flex-1 overflow-auto bg-stone-50">
      <Header title="System Administration" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-display text-stone-800">User Management</h2>
          <div className="flex gap-3">
            <button onClick={() => mlMutation.mutate()} className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm font-semibold hover:bg-purple-700">
              {mlMutation.isPending ? 'Training...' : 'Retrain ML Model'}
            </button>
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[#0f2d26] text-white rounded shadow text-sm font-semibold hover:bg-[#163d34]">
              + Create User
            </button>
          </div>
        </div>

        {isLoading ? <p>Loading users...</p> : (
          <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(users || []).map(u => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono">{u.username}</td>
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3">{u.role_display || u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => {
                        if(window.confirm(`Issue Remote Wipe for ${u.username}? This will erase local device data.`)) {
                          wipeMutation.mutate(u.id)
                        }
                      }} className="text-red-600 hover:text-red-800 text-xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50">
                        Remote Wipe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}