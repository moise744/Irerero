import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function StaffManagementPage() {
  const user = useAuthStore(s => s.user)
  const isCentreMgr = user?.role === 'centre_mgr' || user?.role === 'sys_admin'
  const qc = useQueryClient()
  
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'caregiver' })

  const { data: staff, isLoading } = useQuery({
    queryKey: ['centre-staff'],
    queryFn: () => api.get('/users/centre-staff/').then(r => r.data),
    enabled: isCentreMgr,
  })

  const createStaffMutation = useMutation({
    mutationFn: (userData) => api.post('/users/centre-staff/', userData),
    onSuccess: () => {
      alert('Staff added successfully.')
      setShowAdd(false)
      setNewUser({ username: '', full_name: '', password: '', role: 'caregiver' })
      qc.invalidateQueries(['centre-staff'])
    },
    onError: (err) => alert(`Error: ${err.response?.data?.detail || err.message}`)
  })

  const removeStaffMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/centre-staff/${id}/`),
    onSuccess: () => qc.invalidateQueries(['centre-staff'])
  })

  if (!isCentreMgr) return <div className="p-8 text-center">Access Restricted to Centre Managers.</div>

  const handleCreate = (e) => {
    e.preventDefault()
    createStaffMutation.mutate(newUser)
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Staff Management" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-display text-ink tracking-tight">Centre Staff</h2>
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 btn-gradient rounded-lg text-sm font-semibold">
            + Add Staff
          </button>
        </div>

        {isLoading ? <p>Loading staff...</p> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-500 uppercase text-xs tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Full name</th>
                  <th className="px-4 py-3.5 font-semibold">Username</th>
                  <th className="px-4 py-3.5 font-semibold">Role</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(staff || []).map(s => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 font-mono">{s.username}</td>
                    <td className="px-4 py-3">{s.role_display || s.role}</td>
                    <td className="px-4 py-3 text-right">
                      {s.id !== user?.id && (
                        <button onClick={() => {
                          if(window.confirm(`Remove ${s.full_name} from your centre?`)) {
                            removeStaffMutation.mutate(s.id)
                          }
                        }} className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD STAFF MODAL */}
      {showAdd && (
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-8 w-full max-w-md">
            <h3 className="font-display text-2xl font-bold text-ink mb-6">Add Staff Member</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input required className="w-full border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none px-3.5 py-2.5 rounded-lg transition-all" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                <input required className="w-full border px-3 py-2 rounded" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
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
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={createStaffMutation.isPending} className="px-5 py-2.5 btn-gradient rounded-lg font-semibold disabled:opacity-50">
                  {createStaffMutation.isPending ? 'Saving...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
