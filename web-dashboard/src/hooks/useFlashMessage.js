import { useState, useEffect, useCallback } from 'react'

/**
 * In-page success / error messages (auto-dismiss). Use with <FlashBanner flash={flash} />.
 */
export function useFlashMessage(duration = 6500) {
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(null), duration)
    return () => clearTimeout(t)
  }, [flash, duration])

  const success = useCallback(text => setFlash({ kind: 'ok', text }), [])
  const error = useCallback(text => setFlash({ kind: 'err', text }), [])
  const clear = useCallback(() => setFlash(null), [])

  return { flash, success, error, clear, setFlash }
}
