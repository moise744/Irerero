// src/App.jsx — routing with Outlet + auth bootstrap so APIs run with correct role
// P5: SPA routing handled — catch-all route redirects to login or home
// P6: Session timeout — auto-logout after 30 min inactivity
// P7: Fixed auth bootstrap error handling to prevent 500 on page refresh
import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import Sidebar from './components/layout/Sidebar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ChildrenPage from './pages/ChildrenPage'
import AlertsPage from './pages/AlertsPage'
import SmsInboxPage from './pages/SmsInboxPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import StaffManagementPage from './pages/StaffManagementPage'
import SyncConflictsPage from './pages/SyncConflictsPage'
import FoodStockPage from './pages/FoodStockPage'
import SmsCampaignPage from './pages/SmsCampaignPage'
import AdminToolsPage from './pages/AdminToolsPage'
import ReportBuilderPage from './pages/ReportBuilderPage'

/** P7: Wait for /auth/me when a token exists — handles 401 gracefully. */
function useAuthBootstrap() {
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const isSessionExpired = useAuthStore(s => s.isSessionExpired)
  const [ready, setReady] = useState(!token)

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    // P6: Check session timeout on app load
    if (isSessionExpired()) {
      logout()
      setReady(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await useAuthStore.getState().loadUser()
      } catch (err) {
        // P7: If loadUser fails (401/network), clear token and redirect to login
        console.warn('Auth bootstrap failed:', err)
        await logout()
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, logout, isSessionExpired])

  return ready
}

/** P6: Inactivity timer — logs user out after 30 min of no interaction */
function useInactivityTimer() {
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const touchActivity = useAuthStore(s => s.touchActivity)
  const isSessionExpired = useAuthStore(s => s.isSessionExpired)

  const checkTimeout = useCallback(() => {
    if (token && isSessionExpired()) {
      logout()
    }
  }, [token, logout, isSessionExpired])

  useEffect(() => {
    if (!token) return

    // Touch activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => touchActivity()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))

    // Check timeout every 60 seconds
    const interval = setInterval(checkTimeout, 60_000)

    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearInterval(interval)
    }
  }, [token, touchActivity, checkTimeout])
}

function RequireAuth() {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

function ProtectedShell() {
  // P6: activate the inactivity timer inside the protected shell
  useInactivityTimer()

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  const token = useAuthStore(s => s.token)
  const bootstrapped = useAuthBootstrap()

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-100 text-stone-600">
        <div
          className="h-9 w-9 border-[3px] border-stone-300 border-t-[#0f2d26] rounded-full animate-spin"
          aria-hidden
        />
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<ProtectedShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="sms-inbox" element={<SmsInboxPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="staff" element={<StaffManagementPage />} />
          <Route path="sync-conflicts" element={<SyncConflictsPage />} />
          <Route path="food-stock" element={<FoodStockPage />} />
          <Route path="sms-campaign" element={<SmsCampaignPage />} />
          <Route path="admin-tools" element={<AdminToolsPage />} />
          <Route path="report-builder" element={<ReportBuilderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
    </Routes>
  )
}
