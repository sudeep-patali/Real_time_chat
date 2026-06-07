import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SettingsNav from '../components/settings/SettingsNav'
import AppearanceSection       from '../components/settings/sections/AppearanceSection'
import NotificationsSection    from '../components/settings/sections/NotificationsSection'
import PrivacySection          from '../components/settings/sections/PrivacySection'
import ChatSettingsSection     from '../components/settings/sections/ChatSettingsSection'
import GroupsSection           from '../components/settings/sections/GroupsSection'
import AccountSection          from '../components/settings/sections/AccountSection'
import DevicesSection          from '../components/settings/sections/DevicesSection'
import SecurityLogsSection     from '../components/settings/sections/SecurityLogsSection'
import AccessibilitySection    from '../components/settings/sections/AccessibilitySection'
import { useSettingsStore }    from '../store/settingsStore'
import '../styles/settings.css'

const SECTIONS = {
  appearance:    <AppearanceSection />,
  notifications: <NotificationsSection />,
  privacy:       <PrivacySection />,
  chat:          <ChatSettingsSection />,
  groups:        <GroupsSection />,
  account:       <AccountSection />,
  devices:       <DevicesSection />,
  'security-logs': <SecurityLogsSection />,
  accessibility: <AccessibilitySection />,
}

function Settings() {
  const [activeSection, setActiveSection] = useState('appearance')
  const { loadSettings } = useSettingsStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadSettings()
  }, [])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="settings-shell">
      <Navbar />
      <div className="settings-layout">
        <aside className="settings-sidebar">
          {/* ── Back Button ── */}
          <button className="settings-back-btn" onClick={handleBack} aria-label="Go back">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 5l-7 7 7 7" />
            </svg>
            <span>Back</span>
          </button>

          <SettingsNav activeSection={activeSection} onSelect={setActiveSection} />
        </aside>

        <main className="settings-content" id="main-content">
          {SECTIONS[activeSection] || null}
        </main>
      </div>
    </div>
  )
}

export default Settings