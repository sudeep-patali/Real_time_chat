import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import { updatePrivacy } from '../../../services/userService'
import Toggle from '../Toggle'

const ADD_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'accepted', label: 'My Contacts' },
  { value: 'nobody', label: 'Nobody' },
]

function GroupsSection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const groups = settings.groups || {}

  // FIX: Previously this read from settings.privacy?.addToGroups via a local
  // useEffect that only ran once on mount, so the value could be stale if
  // settings loaded after the component mounted. Now we read directly from
  // the store, which is kept up-to-date by the improved loadSettings().
  const addToGroups = settings.privacy?.addToGroups || 'everyone'

  const updateGroups = async (key, value) => {
    updateSection('groups', { [key]: value })
    try { await saveSettings() }
    catch { addAlert({ message: 'Failed to save', type: 'error' }) }
  }

  const saveAddToGroups = async (value) => {
    // Optimistic update in the store
    updateSection('privacy', { addToGroups: value })
    try {
      await updatePrivacy({ addToGroups: value })
      addAlert({ message: 'Group invitation setting saved', type: 'success' })
    } catch {
      // Roll back
      updateSection('privacy', { addToGroups })
      addAlert({ message: 'Failed to save', type: 'error' })
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Groups
      </div>

      <div className="settings-subsection-label">Group Invitations</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Who Can Add Me to Groups</div>
          <div className="settings-row-desc">Control who can invite you to group chats</div>
        </div>
        <select
          className="settings-select"
          value={addToGroups}
          onChange={e => saveAddToGroups(e.target.value)}
        >
          {ADD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="settings-subsection-label">Group Notifications</div>
      <div className="settings-row">
        <Toggle
          checked={!!groups.muteAll}
          onChange={v => updateGroups('muteAll', v)}
          label="Mute All Groups"
          description="Silence notifications from all group chats"
        />
      </div>
      <div className="settings-row">
        <Toggle
          checked={!!groups.mentionNotifs}
          onChange={v => updateGroups('mentionNotifs', v)}
          disabled={!!groups.muteAll}
          label="Mention Notifications"
          description="Still notify when @mentioned even if muted"
        />
      </div>
    </div>
  )
}

export default GroupsSection