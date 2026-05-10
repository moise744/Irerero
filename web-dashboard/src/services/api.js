// src/services/api.js
import axios from 'axios'

export function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { hostname, protocol } = window.location
    if (hostname !== 'localhost' && hostname !== '127.0.0.1')
      return `${protocol}//${hostname}:8000/api/v1`
  }
  return 'http://localhost:8000/api/v1'
}

const api = axios.create()
api.interceptors.request.use(cfg => {
  cfg.baseURL = resolveApiBase()
  const t = localStorage.getItem('access_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('access_token'); window.location.href='/login' }
  return Promise.reject(err)
})
export default api

export const authApi = {
  login:  (u,p) => api.post('/auth/login/', {username:u, password:p}),
  me:     ()    => api.get('/auth/me/'),
  logout: (r)   => api.post('/auth/logout/', {refresh:r}),
}

// Added 'p' (parameters) so filters can be sent to the backend
export const dashboardApi = {
  caregiver: (p) => api.get('/reports/dashboards/caregiver/', {params:p}),
  centre:    (p) => api.get('/reports/dashboards/centre/', {params:p}),
  sector:    (p) => api.get('/reports/dashboards/sector/', {params:p}),
  district:  (p) => api.get('/reports/dashboards/district/', {params:p}),
  national:  (p) => api.get('/reports/dashboards/national/', {params:p}),
}

export const childrenApi = {
  list:           p  => api.get('/children/', {params:p}),
  get:            id => api.get(`/children/${id}/`),
  growthChart:    id => api.get(`/measurements/${id}/growth-chart/`),
  measurements:   id => api.get('/measurements/', {params:{child:id}}),
  alerts:         id => api.get('/alerts/', {params:{child:id}}),
  referrals:      id => api.get('/referrals/', {params:{child:id}}),
  immunisations:  id => api.get('/children/immunisations/', {params:{child:id}}),
}

export const alertsApi = {
  list:   p  => api.get('/alerts/', {params:p}),
  action: (id,txt) => api.patch(`/alerts/${id}/action/`, {action_taken:txt}),
}

export const referralsApi = {
  list:   p  => api.get('/referrals/', {params:p}),
}

export const smsApi = {
  log:   p    => api.get('/notifications/sms-log/', {params:p}),
  batch: data => api.post('/notifications/sms/batch/', data),
}

export const reportsApi = {
  monthly: p   => api.get('/reports/monthly/', {params:p}),
  approve: (id,notes) => api.post(`/reports/monthly/${id}/approve/`, {manager_notes:notes}),
  generate: () => api.post('/reports/monthly/generate/'),
  pdfUrl:  id  => `${resolveApiBase()}/reports/monthly/${id}.pdf`,
  csvUrl:  id  => `${resolveApiBase()}/reports/monthly/${id}.csv`,
  sectorPdfUrl: () => `${resolveApiBase()}/reports/sector/report.pdf`,
}

/**
 * P1 Fix: Download a file using an authenticated fetch request.
 * Regular <a href> links don't send the Bearer token, causing 401 errors.
 * This function fetches the file with auth headers and triggers a download.
 */
export async function authenticatedDownload(url, filename) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}