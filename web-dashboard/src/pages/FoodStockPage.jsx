import { useState } from 'react'
import Header from '../components/layout/Header'
import { useAuthStore } from '../hooks/useAuth'

export default function FoodStockPage() {
  const user = useAuthStore(s => s.user)
  
  // Mock data for food stock
  const [stock, setStock] = useState([
    { id: 1, item: 'Shisha Macari (Porridge Flour)', quantity: 25, unit: 'kg', minThreshold: 10, status: 'ok' },
    { id: 2, item: 'RUTF (Plumpy\'Nut)', quantity: 4, unit: 'cartons', minThreshold: 5, status: 'low' },
    { id: 3, item: 'Milk Powder', quantity: 0, unit: 'kg', minThreshold: 5, status: 'empty' },
  ])

  const getStatusColor = (status) => {
    switch(status) {
      case 'ok': return 'bg-teal/10 text-teal'
      case 'low': return 'bg-amber-100 text-amber-800'
      case 'empty': return 'bg-danger/10 text-danger'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas relative">
      <Header title="Food Stock Management" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold font-display text-ink tracking-tight">Nutrition Stock</h2>
            <p className="text-sm text-stone-500 mt-1">Manage RUTF and supplementary feeding supplies.</p>
          </div>
          <button className="px-5 py-2.5 btn-gradient rounded-lg text-sm font-semibold" onClick={() => alert('Requesting more stock from Sector Coordinator...')}>
            Request Stock
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-xs tracking-wider border-b border-stone-100">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Item Name</th>
                <th className="px-4 py-3.5 font-semibold text-right">Quantity</th>
                <th className="px-4 py-3.5 font-semibold">Unit</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stock.map(s => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{s.item}</td>
                  <td className="px-4 py-3 tabular-nums text-right font-semibold">{s.quantity}</td>
                  <td className="px-4 py-3 text-stone-600">{s.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(s.status)}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-accent hover:text-accent-light text-xs font-bold transition-colors" onClick={() => alert('Updating inventory counts...')}>
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
