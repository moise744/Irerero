// src/hooks/useAuth.js
import { create } from 'zustand'
import { authApi } from '../services/api'

export const useAuthStore = create(set => ({
  user:  null,
  token: localStorage.getItem('access_token'),
  login: async (username, password) => {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    set({ user: data.user, token: data.access })
    return data
  },
  logout: async () => {
    try { await authApi.logout(localStorage.getItem('refresh_token')) } catch {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null })
  },
  loadUser: async () => {
    try { const { data } = await authApi.me(); set({ user: data }) } catch {}
  },
}))
