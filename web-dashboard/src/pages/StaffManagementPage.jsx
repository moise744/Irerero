import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import FlashBanner from '../components/ui/FlashBanner'

export default function StaffManagementPage() {
  const user = useAuthStore(s => s.user)
  const isCentreMgr = user?.role === 'centre_mgr' || user?.role === 'sys_admin'
  const qc = useQueryClient()
  const { flash, success, error } = useFlashMessage()

  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'caregiver' })

  const { data: staff, isLoading } = useQuery({
    queryKey: ['centre-staff'],
    queryFn: () => api.get('/users/centre-staff/').then(r => r.data),
    enabled: isCentreMgr,
  })

  const createStaffMutation = useMutation({
    mutationFn: userData => api.post('/users/centre-staff/', userData),
    onSuccess: () => {
      success('Staff member added successfully.')
      setShowAdd(false)
      setNewUser({ username: '', full_name: '', password: '', role: 'caregiver' })
      qc.invalidateQueries(['centre-staff'])
    },
    onError: err => error(err?.response?.data?.detail || err.message || 'Could not add staff.'),
  })

  const removeStaffMutation = useMutation({
    mutationFn: id => api.delete(`/users/centre-staff/${id}/`),
    onSuccess: () => {
      success('Staff member removed from this centre.')
      qc.invalidateQueries(['centre-staff'])
    },
    onError: err => error(err?.response?.data?.detail || err.message || 'Could not remove staff.'),
  })

  if (!isCentreMgr)
    return (
      <div className="p-8 text-center text-ink-muted bg-canvas min-h-[40vh] flex items-center justify-center">
        Access restricted to centre managers.
      </div>
    )

  const handleCreate = e => {
    e.preventDefault()
    createStaffMutation.mutate(newUser)
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Staff Management" />

      <div className="p-6 md:p-8">
        <FlashBanner flash={flash} className="mb-6" />
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h2 className="text-2xl font-extrabold font-display text-ink-display tracking-wide">Centre staff</h2>
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
            Add staff
          </button>
        </div>

        {isLoading ? (
          <p className="text-ink-muted">Loading staff…</p>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm text-left table-standard">
              <thead>
                <tr>
                  <th className="px-4 py-3.5">Full name</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-card">
                {(staff || []).map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-ink">{s.full_name}</td>
                    <td className="px-4 py-3 font-mono text-ink-muted text-xs">{s.username}</td>
                    <td className="px-4 py-3 text-ink-muted">{s.role_display || s.role}</td>
                    <td className="px-4 py-3 text-right">
                      {s.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${s.full_name} from your centre?`)) {
                              removeStaffMutation.mutate(s.id)
                            }
                          }}
                          className="text-coral hover:text-coral-hover text-xs font-semibold px-2 py-1 rounded-lg hover:bg-surface-blush transition-colors"
                        >
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

      {showAdd && (
        <div className="modal-overlay">
          <div className="card p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-2xl font-extrabold text-ink-display tracking-wide mb-6">Add staff member</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="field-label">Full name</label>
                <input
                  required
                  className="input-field"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Username</label>
                <input required className="input-field" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
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
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={createStaffMutation.isPending} className="btn-primary disabled:opacity-50">
                  {createStaffMutation.isPending ? 'Saving…' : 'Add staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
