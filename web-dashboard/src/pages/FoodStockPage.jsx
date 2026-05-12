import { useState } from 'react'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function FoodStockPage() {
  useAuthStore(s => s.user)

  const [stock] = useState([
    { id: 1, item: 'Shisha Macari (Porridge Flour)', quantity: 25, unit: 'kg', minThreshold: 10, status: 'ok' },
    { id: 2, item: "RUTF (Plumpy'Nut)", quantity: 4, unit: 'cartons', minThreshold: 5, status: 'low' },
    { id: 3, item: 'Milk Powder', quantity: 0, unit: 'kg', minThreshold: 5, status: 'empty' },
  ])

  const getStatusColor = status => {
    switch (status) {
      case 'ok':
        return 'bg-surface-mint/80 text-forest border border-sage/30'
      case 'low':
        return 'bg-surface-cream text-amber border border-amber/30'
      case 'empty':
        return 'bg-surface-blush text-coral border border-coral/20'
      default:
        return 'bg-surface-blush/50 text-ink border border-border-subtle'
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Food Stock Management" />

      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold font-display text-ink-display tracking-wide">Nutrition stock</h2>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">Manage RUTF and supplementary feeding supplies.</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => alert('Requesting more stock from Sector Coordinator...')}
          >
            Request stock
          </button>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm text-left table-standard">
            <thead>
              <tr>
                <th className="px-4 py-3.5">Item name</th>
                <th className="px-4 py-3.5 text-right">Quantity</th>
                <th className="px-4 py-3.5">Unit</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface-card">
              {stock.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-ink">{s.item}</td>
                  <td className="px-4 py-3 tabular-nums text-right font-semibold text-ink">{s.quantity}</td>
                  <td className="px-4 py-3 text-ink-muted">{s.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${getStatusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-forest hover:text-coral text-xs font-semibold transition-colors"
                      onClick={() => alert('Updating inventory counts...')}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
