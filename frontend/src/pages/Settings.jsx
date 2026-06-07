import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadSettings()
  }, [])

  return (
    <div className="settings-shell">
      <Navbar />
      <div className="settings-layout">
        <SettingsNav activeSection={activeSection} onSelect={setActiveSection} />
        <main className="settings-content" id="main-content">
          {SECTIONS[activeSection] || null}
        </main>
      </div>
    </div>
  )
}

export default Settings