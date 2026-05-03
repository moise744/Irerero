import axios from 'axios'

/**
 * Resolved on each request so phone/LAN URLs always hit :8000 on the same host.
 * Omit VITE_API_URL on LAN testing or it will pin to localhost and break phones.
 */
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
export const dashboardApi = {
  caregiver: () => api.get('/reports/dashboards/caregiver/'),
  centre:    () => api.get('/reports/dashboards/centre/'),
  sector:    () => api.get('/reports/dashboards/sector/'),
  district:  () => api.get('/reports/dashboards/district/'),
  national:  () => api.get('/reports/dashboards/national/'),
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
export const smsApi = {
  log:   p    => api.get('/notifications/sms-log/', {params:p}),
  batch: data => api.post('/notifications/sms/batch/', data),
}
export const reportsApi = {
  monthly: p   => api.get('/reports/monthly/', {params:p}),
  approve: (id,notes) => api.post(`/reports/monthly/${id}/approve/`, {manager_notes:notes}),
  pdfUrl:  id  => `${resolveApiBase()}/reports/monthly/${id}.pdf`,
  csvUrl:  id  => `${resolveApiBase()}/reports/monthly/${id}.csv`,
}
