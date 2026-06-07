import { useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import Toggle from '../Toggle'
import SettingsRow from '../SettingsRow'

function NotificationsSection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const [saving, setSaving] = useState(false)
  const notif = settings.notifications || {}

  const update = async (key, value) => {
    updateSection('notifications', { [key]: value })
    setSaving(true)
    try {
      await saveSettings()
    } catch {
      addAlert({ message: 'Failed to save notification settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      addAlert({ message: 'Browser notifications not supported', type: 'error' })
      return
    }
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      update('browser', true)
      addAlert({ message: 'Browser notifications enabled', type: 'success' })
    } else {
      addAlert({ message: 'Permission denied — check your browser settings', type: 'error' })
    }
  }

  const permissionStatus = typeof Notification !== 'undefined'
    ? Notification.permission
    : 'unavailable'

  const SOUND_OPTIONS = ['None', 'Default', 'Chime', 'Ping']

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Notifications
      </div>

      <div className="settings-subsection-label">Message Notifications</div>
      <div className="settings-row">
        <Toggle
          checked={!!notif.enabled}
          onChange={v => update('enabled', v)}
          label="Enable Notifications"
          description="Receive alerts for new messages"
        />
      </div>
      <div className="settings-row">
        <Toggle
          checked={!!notif.sound}
          onChange={v => update('sound', v)}
          disabled={!notif.enabled}
          label="Notification Sound"
          description="Play a sound when messages arrive"
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Desktop Notifications</div>
          <div className="settings-row-desc">
            {permissionStatus === 'granted'
              ? 'Permission granted'
              : permissionStatus === 'denied'
              ? 'Permission blocked — enable in browser'
              : 'Request browser notification permission'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {permissionStatus !== 'granted' && (
            <button className="settings-btn secondary" onClick={requestBrowserPermission}>
              Request
            </button>
          )}
          <Toggle
            checked={!!notif.browser && permissionStatus === 'granted'}
            onChange={v => update('browser', v)}
            disabled={permissionStatus !== 'granted'}
          />
        </div>
      </div>

      <div className="settings-subsection-label">Group Notifications</div>
      <div className="settings-row">
        <Toggle
          checked={!!notif.groupEnabled}
          onChange={v => update('groupEnabled', v)}
          label="Enable Group Notifications"
          description="Receive alerts for group messages"
        />
      </div>
      <div className="settings-row">
        <Toggle
          checked={!!notif.mentionEnabled}
          onChange={v => update('mentionEnabled', v)}
          disabled={!notif.groupEnabled}
          label="Mention Notifications"
          description="Alert when you're @mentioned in a group"
        />
      </div>

      <div className="settings-subsection-label">Sound Settings</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Message Sound</div>
        </div>
        <select
          className="settings-select"
          value={notif.messageSound || 'default'}
          onChange={e => update('messageSound', e.target.value)}
        >
          {SOUND_OPTIONS.map(s => (
            <option key={s} value={s.toLowerCase()}>{s}</option>
          ))}
        </select>
      </div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Group Message Sound</div>
        </div>
        <select
          className="settings-select"
          value={notif.groupSound || 'default'}
          onChange={e => update('groupSound', e.target.value)}
        >
          {SOUND_OPTIONS.map(s => (
            <option key={s} value={s.toLowerCase()}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default NotificationsSection