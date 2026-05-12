// src/pages/UsersPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import FlashBanner from '../components/ui/FlashBanner'

export default function UsersPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'sys_admin'
  const qc = useQueryClient()
  const { flash, success, error } = useFlashMessage()
  
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
      success('Remote wipe scheduled for the device on next sync.')
      qc.invalidateQueries(['users-admin'])
    },
    onError: err => {
      error(err?.response?.data?.detail || err.message || 'Remote wipe request failed.')
    },
  })

  const mlMutation = useMutation({
    mutationFn: () => api.post('/ai/retrain/'),
    onSuccess: data => {
      const s = data.data?.sensitivity_achieved ?? data.data?.sensitivity
      success(s != null ? `ML model retrained successfully (sensitivity ${s}%).` : 'ML model retrained successfully.')
    },
    onError: err => error(err?.response?.data?.detail || err.message || 'Retrain failed.'),
  })

  const createUserMutation = useMutation({
    mutationFn: (userData) => api.post('/users/', userData),
    onSuccess: () => {
      success('User created successfully.')
      setShowAdd(false)
      setNewUser({ username: '', full_name: '', password: '', role: 'caregiver', centre_id: '' })
      qc.invalidateQueries(['users-admin'])
    },
    onError: (err) => {
      error(
        `Error creating user: ${err.response?.data?.detail || JSON.stringify(err.response?.data || err.message)}`,
      )
    },
  })

  if (!isAdmin)
    return (
      <div className="p-8 text-center text-ink-muted bg-canvas min-h-[40vh] flex items-center justify-center">
        Access restricted to SysAdmin.
      </div>
    )

  const handleCreate = (e) => {
    e.preventDefault()
    createUserMutation.mutate(newUser)
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="System Administration" />
      
      <div className="p-6">
        <FlashBanner flash={flash} className="mb-4" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold font-display text-ink-display tracking-wide">User management</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => mlMutation.mutate()}
              disabled={mlMutation.isPending}
              className="btn-secondary"
            >
              {mlMutation.isPending ? 'Training…' : 'Retrain ML model'}
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              Create user
            </button>
          </div>
        </div>

        {isLoading ? <p>Loading users...</p> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm text-left table-standard">
              <thead>
                <tr>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Full name</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Active</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-card">
                {(users || []).map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.username}</td>
                    <td className="px-4 py-3 font-medium text-ink">{u.full_name}</td>
                    <td className="px-4 py-3 text-ink-muted">{u.role_display || u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                          u.is_active
                            ? 'bg-surface-mint/90 text-forest border-sage/30'
                            : 'bg-surface-blush text-coral border-coral/20'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Issue Remote Wipe for ${u.username}? This will erase local device data.`)) {
                            wipeMutation.mutate(u.id)
                          }
                        }}
                        className="text-coral hover:text-coral-hover text-xs font-semibold border border-coral/25 px-2 py-1 rounded-lg bg-surface-blush/50 transition-colors"
                      >
                        Remote wipe
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
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-2xl font-extrabold text-ink-display tracking-wide mb-6">Create new user</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="field-label">Username</label>
                <input required className="input-field" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Full name</label>
                <input required className="input-field" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  required
                  type="password"
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  className="input-field"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
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
                  <label className="field-label">Centre ID (UUID)</label>
                  <input
                    className="input-field"
                    placeholder="Optional for testing"
                    value={newUser.centre_id}
                    onChange={e => setNewUser({ ...newUser, centre_id: e.target.value })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={createUserMutation.isPending} className="btn-primary disabled:opacity-50">
                  {createUserMutation.isPending ? 'Saving…' : 'Save user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}