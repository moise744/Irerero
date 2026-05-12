// Nutritional status badge — brand palette only
const CONFIG = {
  sam: { bg: 'bg-surface-blush', text: 'text-coral', label: 'SAM' },
  mam: { bg: 'bg-surface-cream', text: 'text-amber', label: 'MAM' },
  stunted: { bg: 'bg-surface-cream', text: 'text-amber', label: 'Stunted' },
  severely_stunted: { bg: 'bg-surface-blush', text: 'text-coral', label: 'Sev. stunted' },
  underweight: { bg: 'bg-surface-cream', text: 'text-amber', label: 'Underweight' },
  at_risk: { bg: 'bg-surface-cream', text: 'text-amber', label: 'At risk' },
  normal: { bg: 'bg-surface-mint/90', text: 'text-forest', label: 'Normal' },
}

export default function StatusBadge({ status }) {
  const key = String(status || 'normal').toLowerCase()
  const c = CONFIG[key] || CONFIG.normal
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-border-subtle/80 ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  )
}
