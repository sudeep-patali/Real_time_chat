import { useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import Toggle from '../Toggle'

// ── Inline sound preview (mirrors logic from useNotification) ──────────────
function previewSound(soundType, soundVariant = 'default') {
  if (soundVariant === 'none') return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    if (soundVariant === 'chime') {
      const now = ctx.currentTime
      ;[1318, 1046, 880].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.18)
        gain.gain.setValueAtTime(0.22, now + i * 0.18)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.25)
        osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.25)
      })
      return
    }

    if (soundVariant === 'ping') {
      const now = ctx.currentTime
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1760, now)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc.start(now); osc.stop(now + 0.18)
      return
    }

    // default
    if (soundType === 'group') {
      const now = ctx.currentTime
      ;[880, 1046, 1318].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.1)
        gain.gain.setValueAtTime(0.2, now + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15)
        osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.15)
      })
    } else {
      const playTone = (freq, startTime, duration) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        osc.start(startTime); osc.stop(startTime + duration)
      }
      const now = ctx.currentTime
      playTone(880, now,        0.12)
      playTone(660, now + 0.14, 0.18)
    }
  } catch {}
}

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

  const SOUND_OPTIONS = [
    { label: 'None',    value: 'none' },
    { label: 'Default', value: 'default' },
    { label: 'Chime',   value: 'chime' },
    { label: 'Ping',    value: 'ping' },
  ]

  const messageSoundVal = notif.messageSound || 'default'
  const groupSoundVal   = notif.groupSound   || 'default'

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        Notifications
      </div>

      {/* ── MESSAGE NOTIFICATIONS ── */}
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
            <button
              className="settings-btn secondary"
              onClick={requestBrowserPermission}
              disabled={!notif.enabled}
            >
              Request
            </button>
          )}
          <Toggle
            checked={!!notif.browser && permissionStatus === 'granted'}
            onChange={v => update('browser', v)}
            disabled={permissionStatus !== 'granted' || !notif.enabled}
          />
        </div>
      </div>

      {/* ── GROUP NOTIFICATIONS ── */}
      <div className="settings-subsection-label">Group Notifications</div>

      <div className="settings-row">
        <Toggle
          checked={!!notif.groupEnabled}
          onChange={v => update('groupEnabled', v)}
          disabled={!notif.enabled}
          label="Enable Group Notifications"
          description="Receive alerts for group messages"
        />
      </div>

      <div className="settings-row">
        <Toggle
          checked={!!notif.mentionEnabled}
          onChange={v => update('mentionEnabled', v)}
          disabled={!notif.enabled || !notif.groupEnabled}
          label="Mention Notifications"
          description="Alert when you're @mentioned in a group"
        />
      </div>

      {/* ── SOUND SETTINGS ── */}
      <div className="settings-subsection-label">Sound Settings</div>

      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Message Sound</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {messageSoundVal !== 'none' && notif.sound && notif.enabled && (
            <button
              className="settings-btn secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => previewSound('message', messageSoundVal)}
              title="Preview sound"
            >
              ▶ Preview
            </button>
          )}
          <select
            className="settings-select"
            value={messageSoundVal}
            disabled={!notif.sound || !notif.enabled}
            onChange={e => update('messageSound', e.target.value)}
          >
            {SOUND_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Group Message Sound</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {groupSoundVal !== 'none' && notif.sound && notif.enabled && notif.groupEnabled && (
            <button
              className="settings-btn secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => previewSound('group', groupSoundVal)}
              title="Preview sound"
            >
              ▶ Preview
            </button>
          )}
          <select
            className="settings-select"
            value={groupSoundVal}
            disabled={!notif.sound || !notif.enabled || !notif.groupEnabled}
            onChange={e => update('groupSound', e.target.value)}
          >
            {SOUND_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {saving && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'right' }}>
          Saving…
        </div>
      )}
    </div>
  )
}

export default NotificationsSection