import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { smsApi } from '../services/api'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function SmsCampaignPage() {
  const user = useAuthStore(s => s.user)
  const isAuthorized = ['district', 'national', 'sys_admin'].includes(user?.role)
  
  const [target, setTarget] = useState('all_parents')
  const [message, setMessage] = useState('')

  const batchMutation = useMutation({
    mutationFn: (data) => smsApi.batch(data),
    onSuccess: () => {
      alert('Batch SMS dispatch scheduled successfully.')
      setMessage('')
    },
    onError: (err) => alert(`Error: ${err.response?.data?.detail || err.message}`)
  })

  if (!isAuthorized) return <div className="p-8 text-center">Access Restricted to District/National Officers.</div>

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    if (window.confirm('Are you sure you want to send this message to the selected group? This will incur SMS charges.')) {
      batchMutation.mutate({ target_group: target, message })
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="SMS Campaigns" />
      
      <div className="p-6">
        <div className="max-w-2xl card p-8">
          <h2 className="text-2xl font-bold font-display text-ink mb-2 tracking-tight">Compose Batch SMS</h2>
          <p className="text-sm text-stone-500 mb-8">Send important announcements to parents or staff.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide mb-2">Target Audience</label>
              <select className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                value={target} onChange={e => setTarget(e.target.value)}>
                <option value="all_parents">All Parents (Global)</option>
                <option value="all_caregivers">All ECD Caregivers (Global)</option>
                <option value="district_parents">Parents in my District</option>
                <option value="district_caregivers">ECD Caregivers in my District</option>
                <option value="sam_parents">Parents of SAM children</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide mb-2">Message Body</label>
              <textarea 
                required
                className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm resize-none"
                rows={5}
                placeholder="Type your message here... Keep it concise."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <p className="text-xs text-stone-500 mt-2 text-right">
                {message.length} characters ({(Math.ceil(message.length / 160) || 1)} SMS part{Math.ceil(message.length / 160) > 1 ? 's' : ''})
              </p>
            </div>

            <button 
              type="submit" 
              disabled={batchMutation.isPending || !message.trim()}
              className="w-full py-3.5 btn-gradient rounded-lg text-sm font-bold tracking-wide"
            >
              {batchMutation.isPending ? 'Sending...' : 'Dispatch SMS Batch'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
