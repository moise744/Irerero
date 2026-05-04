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
  const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'caregiver', centre_id: '' })

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

  const createUserMutation = useMutation({
    mutationFn: (userData) => api.post('/users/', userData),
    onSuccess: () => {
      alert('User created successfully.')
      setShowAdd(false)
      setNewUser({ username: '', full_name: '', password: '', role: 'caregiver', centre_id: '' })
      qc.invalidateQueries(['users-admin'])
    },
    onError: (err) => {
      alert(`Error creating user: ${err.response?.data?.detail || JSON.stringify(err.response?.data)}`)
    }
  })

  if (!isAdmin) return <div className="p-8 text-center">Access Restricted to SysAdmin.</div>

  const handleCreate = (e) => {
    e.preventDefault()
    createUserMutation.mutate(newUser)
  }

  return (
    <div className="flex-1 overflow-auto bg-stone-50 relative">
      <Header title="System Administration" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-display text-stone-800">User Management</h2>
          <div className="flex gap-3">
            <button onClick={() => mlMutation.mutate()} disabled={mlMutation.isPending} className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
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

      {/* CREATE USER MODAL */}
      {showAdd && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create New User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                <input required className="w-full border px-3 py-2 rounded" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input required className="w-full border px-3 py-2 rounded" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <input required type="password" placeholder="Min 8 chars, 1 letter, 1 number" className="w-full border px-3 py-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Role</label>
                <select className="w-full border px-3 py-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="caregiver">ECD Caregiver</option>
                  <option value="chw">Community Health Worker</option>
                  <option value="centre_mgr">Centre Manager</option>
                  <option value="sector">Sector ECD Coordinator</option>
                  <option value="district">District ECD Officer</option>
                  <option value="sys_admin">System Administrator</option>
                </select>
              </div>
              {['caregiver', 'chw', 'centre_mgr'].includes(newUser.role) && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Centre ID (UUID)</label>
                  <input className="w-full border px-3 py-2 rounded" placeholder="Optional for testing" value={newUser.centre_id} onChange={e => setNewUser({...newUser, centre_id: e.target.value})} />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold">Cancel</button>
                <button type="submit" disabled={createUserMutation.isPending} className="px-4 py-2 bg-[#0f2d26] text-white rounded font-semibold disabled:opacity-50">
                  {createUserMutation.isPending ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}