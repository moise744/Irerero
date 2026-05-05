// src/components/layout/StatusBadge.jsx
// Colour + text — NFR-016 (never colour alone)
const CONFIG = {
  sam: { bg: 'bg-brand-accent/10', text: 'text-brand-accent', label: 'SAM' },
  mam: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'MAM' },
  stunted: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Stunted' },
  severely_stunted: { bg: 'bg-brand-accent/10', text: 'text-brand-accent', label: 'Sev. stunted' },
  underweight: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Underweight' },
  at_risk: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'At risk' },
  normal: { bg: 'bg-brand-success/10', text: 'text-brand-success', label: 'Normal' },
}
export default function StatusBadge({ status }) {
  const c = CONFIG[status] || CONFIG.normal
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
