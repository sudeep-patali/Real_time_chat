import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useNotificationStore } from '../../../store/notificationStore'
import { exportChatHistory, downloadMyData, deleteAccount, logoutAllDevices } from '../../../services/settingsService'
import ConfirmModal from '../ConfirmModal'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function AccountSection() {
  const { logout } = useAuth()
  const addAlert = useNotificationStore(s => s.addAlert)
  const [modal, setModal] = useState(null) // 'logout-all' | 'delete'
  const [loadingExport, setLoadingExport] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const handleExport = async () => {
    setLoadingExport(true)
    try {
      const res = await exportChatHistory()
      downloadBlob(res.data, 'chat-history.json')
      addAlert({ message: 'Chat history exported', type: 'success' })
    } catch {
      addAlert({ message: 'Export failed', type: 'error' })
    } finally {
      setLoadingExport(false)
    }
  }

  const handleDownloadData = async () => {
    setLoadingData(true)
    try {
      const res = await downloadMyData()
      downloadBlob(res.data, 'my-data.json')
      addAlert({ message: 'Your data has been downloaded', type: 'success' })
    } catch {
      addAlert({ message: 'Download failed', type: 'error' })
    } finally {
      setLoadingData(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      await logoutAllDevices()
      addAlert({ message: 'Logged out from all devices', type: 'success' })
      setModal(null)
      logout()
    } catch {
      addAlert({ message: 'Failed to logout from all devices', type: 'error' })
    }
  }

  const handleDeleteAccount = async (password) => {
    try {
      await deleteAccount(password)
      addAlert({ message: 'Account deleted', type: 'success' })
      setModal(null)
      logout()
    } catch (e) {
      addAlert({ message: e.response?.data?.message || 'Failed to delete account', type: 'error' })
      throw e // Keep modal open
    }
  }

  return (
    <>
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Account
        </div>

        <div className="settings-subsection-label">Data Management</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Export Chat History</div>
            <div className="settings-row-desc">Download your messages as a JSON file</div>
          </div>
          <button className="settings-btn secondary" onClick={handleExport} disabled={loadingExport}>
            {loadingExport ? 'Exporting…' : 'Export'}
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Download My Data</div>
            <div className="settings-row-desc">Get a full copy of all your account data</div>
          </div>
          <button className="settings-btn secondary" onClick={handleDownloadData} disabled={loadingData}>
            {loadingData ? 'Preparing…' : 'Download'}
          </button>
        </div>

        <div className="settings-subsection-label">Account Actions</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Log Out</div>
            <div className="settings-row-desc">Sign out of your current session</div>
          </div>
          <button className="settings-btn secondary" onClick={logout}>
            Log Out
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Logout All Devices</div>
            <div className="settings-row-desc">Sign out from all active sessions</div>
          </div>
          <button className="settings-btn danger" onClick={() => setModal('logout-all')}>
            Logout All
          </button>
        </div>
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div className="settings-row-info">
            <div className="settings-row-label" style={{ color: 'var(--color-error)' }}>Delete Account</div>
            <div className="settings-row-desc">Permanently delete your account and all data</div>
          </div>
          <button className="settings-btn danger" onClick={() => setModal('delete')}>
            Delete
          </button>
        </div>
      </div>

      {modal === 'logout-all' && (
        <ConfirmModal
          title="Logout All Devices"
          message="You will be signed out from all active sessions, including this one. You'll need to log in again."
          confirmLabel="Logout All"
          onConfirm={handleLogoutAll}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'delete' && (
        <ConfirmModal
          title="Delete Account"
          message="This action is irreversible. All your messages, contacts, and data will be permanently deleted."
          confirmLabel="Delete My Account"
          requiresInput
          inputLabel="Enter your password to confirm"
          onConfirm={handleDeleteAccount}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  )
}

export default AccountSection