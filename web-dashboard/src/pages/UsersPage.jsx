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
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="System Administration" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-display text-ink tracking-tight">User Management</h2>
          <div className="flex gap-3">
            <button onClick={() => mlMutation.mutate()} disabled={mlMutation.isPending} className="px-5 py-2.5 bg-primary text-white rounded-lg shadow text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
              {mlMutation.isPending ? 'Training...' : 'Retrain ML Model'}
            </button>
            <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 btn-gradient rounded-lg text-sm font-semibold">
              + Create User
            </button>
          </div>
        </div>

        {isLoading ? <p>Loading users...</p> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-500 uppercase text-xs tracking-wider border-b border-stone-100">
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
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.is_active ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-accent/10 text-brand-accent'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => {
                        if(window.confirm(`Issue Remote Wipe for ${u.username}? This will erase local device data.`)) {
                          wipeMutation.mutate(u.id)
                        }
                      }} className="text-brand-accent hover:text-brand-accent/80 text-xs font-bold border border-brand-accent/20 px-2 py-1 rounded-md bg-brand-accent/5 transition-colors">
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
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-8 w-full max-w-md">
            <h3 className="font-display text-2xl font-bold text-ink mb-6">Create New User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wide">Username</label>
                <input required className="w-full border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3.5 py-2.5 rounded-lg transition-all" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
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
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={createUserMutation.isPending} className="px-5 py-2.5 btn-gradient rounded-lg font-semibold disabled:opacity-50">
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