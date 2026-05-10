// src/hooks/useAuth.js
import { create } from 'zustand'
import { authApi } from '../services/api'

// P6: Session timeout — 30 minutes of inactivity (FR-006)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

export const useAuthStore = create(set => ({
  user:  null,
  token: localStorage.getItem('access_token'),
  login: async (username, password) => {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    localStorage.setItem('last_activity', Date.now().toString())
    set({ user: data.user, token: data.access })
    return data
  },
  logout: async () => {
    try { await authApi.logout(localStorage.getItem('refresh_token')) } catch {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('last_activity')
    set({ user: null, token: null })
  },
  loadUser: async () => {
    try { const { data } = await authApi.me(); set({ user: data }) } catch {}
  },
  /** P6: Touch activity timestamp on user interaction */
  touchActivity: () => {
    localStorage.setItem('last_activity', Date.now().toString())
  },
  /** P6: Check if session has expired */
  isSessionExpired: () => {
    const last = parseInt(localStorage.getItem('last_activity') || '0', 10)
    return last > 0 && (Date.now() - last) > SESSION_TIMEOUT_MS
  },
}))

