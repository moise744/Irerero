// src/pages/SmsInboxPage.jsx — SMS Inbox — FR-080
import Header from '../components/layout/Header'
import SmsInbox from '../components/sms/SmsInbox'
export default function SmsInboxPage() {
  return (
    <div className="flex-1 overflow-auto bg-canvas">
      <Header title="SMS Inbox (Simulated)" />
      <div className="p-6 md:p-8">
        <SmsInbox />
      </div>
    </div>
  )
}
