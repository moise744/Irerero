/**
 * Accessible status banner for mutation success / errors (pairs with useFlashMessage).
 */
export default function FlashBanner({ flash, className = '' }) {
  if (!flash) return null
  const ok = flash.kind === 'ok'
  return (
    <div
      role="status"
      className={`rounded-2xl border-[1.5px] px-4 py-3 text-sm font-medium ${
        ok ? 'border-sage/40 bg-surface-mint/90 text-forest' : 'border-coral/40 bg-surface-blush text-ink'
      } ${className}`}
    >
      {flash.text}
    </div>
  )
}
