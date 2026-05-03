// src/components/layout/StatusBadge.jsx
// Colour + text — NFR-016 (never colour alone)
const CONFIG = {
  sam: { bg: 'bg-red-100', text: 'text-red-800', label: 'SAM' },
  mam: { bg: 'bg-amber-100', text: 'text-amber-900', label: 'MAM' },
  stunted: { bg: 'bg-amber-100', text: 'text-amber-900', label: 'Stunted' },
  severely_stunted: { bg: 'bg-red-100', text: 'text-red-800', label: 'Sev. stunted' },
  underweight: { bg: 'bg-amber-100', text: 'text-amber-900', label: 'Underweight' },
  at_risk: { bg: 'bg-amber-50', text: 'text-amber-800', label: 'At risk' },
  normal: { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'Normal' },
}
export default function StatusBadge({ status }) {
  const c = CONFIG[status] || CONFIG.normal
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
