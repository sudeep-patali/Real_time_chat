import { useState, useEffect } from 'react'
import { useNotificationStore } from '../../../store/notificationStore'
import { getSessions, deleteSession, deleteAllSessions } from '../../../services/settingsService'
import ConfirmModal from '../ConfirmModal'

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function DevicesSection() {
  const addAlert = useNotificationStore(s => s.addAlert)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutAll, setShowLogoutAll] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSessions()
      setSessions(res.data.sessions || [])
    } catch {
      // No sessions endpoint yet → empty list
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRevoke = async (id) => {
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s._id !== id))
      addAlert({ message: 'Session revoked', type: 'success' })
    } catch {
      addAlert({ message: 'Failed to revoke session', type: 'error' })
    }
  }

  const handleRevokeAll = async () => {
    try {
      await deleteAllSessions()
      setSessions([])
      addAlert({ message: 'All sessions revoked', type: 'success' })
    } catch {
      addAlert({ message: 'Failed to revoke sessions', type: 'error' })
    } finally {
      setShowLogoutAll(false)
    }
  }

  return (
    <>
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          Active Devices
        </div>

        {loading ? (
          <div>
            {[1, 2].map(i => (
              <div key={i} className="settings-device-item">
                <div className="settings-skeleton" style={{ width: 42, height: 42, borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div className="settings-skeleton" style={{ height: 14, marginBottom: 6, width: '60%' }} />
                  <div className="settings-skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="settings-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/></svg>
            <div>No active sessions</div>
          </div>
        ) : (
          sessions.map(session => (
            <div key={session._id} className="settings-device-item">
              <div className="settings-device-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              </div>
              <div className="settings-device-info">
                <div className="settings-device-name">{session.device || 'Unknown Device'}</div>
                <div className="settings-device-meta">
                  {session.ip && `${session.ip} · `}
                  {formatRelativeTime(session.lastActive)}
                </div>
              </div>
              <button className="settings-btn danger" onClick={() => handleRevoke(session._id)}>
                Logout
              </button>
            </div>
          ))
        )}

        {sessions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button className="settings-btn danger" style={{ width: '100%' }} onClick={() => setShowLogoutAll(true)}>
              Logout All Devices
            </button>
          </div>
        )}
      </div>

      {showLogoutAll && (
        <ConfirmModal
          title="Logout All Devices"
          message="All active sessions will be immediately terminated."
          confirmLabel="Logout All"
          onConfirm={handleRevokeAll}
          onCancel={() => setShowLogoutAll(false)}
        />
      )}
    </>
  )
}

export default DevicesSection