// src/App.jsx — routing with Outlet + auth bootstrap so APIs run with correct role
import { useEffect, useState } from 'react'
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

/** Wait for /auth/me when a token exists so role-scoped dashboards query the right endpoint. */
function useAuthBootstrap() {
  const token = useAuthStore(s => s.token)
  const [ready, setReady] = useState(!token)

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await useAuthStore.getState().loadUser()
      } catch {
        /* 401 clears token via interceptor */
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return ready
}

function RequireAuth() {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

function ProtectedShell() {
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
    </Routes>
  )
}
