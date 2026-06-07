import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import { changePassword } from '../../../services/settingsService'
import { updatePrivacy, getBlockedUsers, blockUser } from '../../../services/userService'
import Toggle from '../Toggle'
import SettingsRow from '../SettingsRow'

const VISIBILITY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'accepted', label: 'My Contacts' },
  { value: 'nobody', label: 'Nobody' },
]

function PrivacySection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [blocked, setBlocked] = useState([])
  const [loadingBlocked, setLoadingBlocked] = useState(true)

  // FIX: Instead of maintaining a separate local privacyForm state that diverges
  // from the store, we read directly from settings.privacy. The improved
  // getSettings endpoint now merges lastSeen/onlineStatus into settings.privacy
  // so the store always has the full picture.
  const privacy = settings.privacy || {}

  useEffect(() => {
    setLoadingBlocked(true)
    getBlockedUsers()
      .then(r => setBlocked(r.data.blockedUsers || r.data.users || []))
      .catch(() => {})
      .finally(() => setLoadingBlocked(false))
  }, [])

  // Save a privacy field. Fields like readReceipts/typingIndicator are stored
  // under user.privacy in the DB (not user.settings.privacy) so we call
  // updatePrivacy which maps to PUT /api/users/me/privacy.
  // We also update the local store so the UI is in sync without a reload.
  const savePrivacy = async (patch) => {
    // Optimistic store update for immediate UI feedback
    updateSection('privacy', patch)
    try {
      await updatePrivacy({ ...privacy, ...patch })
      addAlert({ message: 'Privacy settings saved', type: 'success' })
    } catch {
      // Roll back the optimistic update
      updateSection('privacy', privacy)
      addAlert({ message: 'Failed to save privacy settings', type: 'error' })
    }
  }

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next)
      return addAlert({ message: 'Please fill in all password fields', type: 'error' })
    if (pwForm.next !== pwForm.confirm)
      return addAlert({ message: 'New passwords do not match', type: 'error' })
    if (pwForm.next.length < 6)
      return addAlert({ message: 'Password must be at least 6 characters', type: 'error' })
    setPwLoading(true)
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwForm({ current: '', next: '', confirm: '' })
      addAlert({ message: 'Password changed successfully', type: 'success' })
    } catch (e) {
      addAlert({ message: e.response?.data?.message || 'Failed to change password', type: 'error' })
    } finally {
      setPwLoading(false)
    }
  }

  const handleUnblock = async (userId) => {
    try {
      await blockUser(userId) // toggles
      setBlocked(prev => prev.filter(u => (u._id || u.id) !== userId))
      addAlert({ message: 'User unblocked', type: 'success' })
    } catch {
      addAlert({ message: 'Failed to unblock user', type: 'error' })
    }
  }

  return (
    <>
      {/* Account Security */}
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Privacy &amp; Security
        </div>

        <div className="settings-subsection-label">Change Password</div>
        <div className="settings-input-group">
          <input
            type="password"
            className="settings-input"
            placeholder="Current password"
            value={pwForm.current}
            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
          />
          <input
            type="password"
            className="settings-input"
            placeholder="New password"
            value={pwForm.next}
            onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
          />
          <input
            type="password"
            className="settings-input"
            placeholder="Confirm new password"
            value={pwForm.confirm}
            onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
          />
          <button
            className="settings-btn primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Privacy Controls */}
      <div className="settings-panel">
        <div className="settings-section-title" style={{ fontSize: 16 }}>Privacy Controls</div>

        <div className="settings-subsection-label">Visibility</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Last Seen</div>
            <div className="settings-row-desc">Who can see when you were last online</div>
          </div>
          {/* FIX: Now reads from settings.privacy.lastSeen (populated by the
              improved getSettings endpoint) instead of local state that was
              never properly initialised from the store. */}
          <select className="settings-select" value={privacy.lastSeen || 'everyone'}
            onChange={e => savePrivacy({ lastSeen: e.target.value })}>
            {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Online Status</div>
            <div className="settings-row-desc">Who can see when you're online</div>
          </div>
          <select className="settings-select" value={privacy.onlineStatus || 'everyone'}
            onChange={e => savePrivacy({ onlineStatus: e.target.value })}>
            {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="settings-subsection-label">Interaction</div>
        <div className="settings-row">
          <Toggle
            checked={privacy.readReceipts !== false}
            onChange={v => savePrivacy({ readReceipts: v })}
            label="Read Receipts"
            description="Show when you've read messages"
          />
        </div>
        <div className="settings-row">
          <Toggle
            checked={privacy.typingIndicator !== false}
            onChange={v => savePrivacy({ typingIndicator: v })}
            label="Typing Indicator"
            description="Show when you're typing a message"
          />
        </div>
      </div>

      {/* Blocked Users */}
      <div className="settings-panel">
        <div className="settings-section-title" style={{ fontSize: 16 }}>Blocked Users</div>

        {loadingBlocked ? (
          <div style={{ padding: '16px 0' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div className="settings-skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div className="settings-skeleton" style={{ flex: 1, height: 14 }} />
              </div>
            ))}
          </div>
        ) : blocked.length === 0 ? (
          <div className="settings-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
            <div>No blocked users</div>
          </div>
        ) : (
          blocked.map(user => (
            <div key={user._id || user.id} className="settings-user-item">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="settings-user-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                : <div className="settings-user-avatar">{user.name?.[0]?.toUpperCase()}</div>
              }
              <div className="settings-user-name">{user.name}</div>
              <button className="settings-btn danger" onClick={() => handleUnblock(user._id || user.id)}>Unblock</button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

export default PrivacySection