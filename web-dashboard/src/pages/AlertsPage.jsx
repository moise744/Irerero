// src/pages/AlertsPage.jsx — full alerts list — FR-033, FR-034
import Header from '../components/layout/Header'
import AlertsPanel from '../components/alerts/AlertsPanel'
export default function AlertsPage() {
  return (
    <div className="flex-1 overflow-auto bg-canvas">
      <Header title="Alerts" />
      <div className="p-6 md:p-8">
        <AlertsPanel />
      </div>
    </div>
  )
}
