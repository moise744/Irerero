// src/hooks/useWebSocket.js
// Real-time WebSocket hook — alerts and SMS Inbox — architecture §5.4
import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(path, onMessage) {
  const ws  = useRef(null)
  const connect = useCallback(() => {
    // GAP-015: Connect to backend WebSocket instead of frontend dev server
    let wsHost = window.location.host
    if (wsHost.includes('localhost') || wsHost.includes('127.0.0.1')) {
      wsHost = 'localhost:8000'
    }
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${wsHost}${path}`
    
    ws.current = new WebSocket(wsUrl)
    ws.current.onmessage = e => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.current.onclose   = () => setTimeout(connect, 3000) // auto-reconnect
    ws.current.onerror   = () => ws.current?.close()
  }, [path, onMessage])

  useEffect(() => { connect(); return () => ws.current?.close() }, [connect])
}
