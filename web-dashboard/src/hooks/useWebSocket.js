// src/hooks/useWebSocket.js
// Real-time WebSocket hook — alerts and SMS Inbox — architecture §5.4
import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(path, onMessage) {
  const ws  = useRef(null)
  const url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${path}`

  const connect = useCallback(() => {
    ws.current = new WebSocket(url)
    ws.current.onmessage = e => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.current.onclose   = () => setTimeout(connect, 3000) // auto-reconnect
    ws.current.onerror   = () => ws.current?.close()
  }, [url, onMessage])

  useEffect(() => { connect(); return () => ws.current?.close() }, [connect])
}
