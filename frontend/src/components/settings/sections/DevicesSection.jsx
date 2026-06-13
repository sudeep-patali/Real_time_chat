
import { useState, useEffect, useRef } from 'react'
import { useNotificationStore } from '../../../store/notificationStore'
import { useAuthStore }         from '../../../store/authStore'
import {
  getSessions,
  deleteAllSessions,
  forceLogoutDevice,
} from '../../../services/settingsService'
import { socket }    from '../../../socket/socket'
import ConfirmModal  from '../ConfirmModal'

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}


function getCurrentDeviceId() {
  try {
    return sessionStorage.getItem('deviceId') || ''
  } catch {
    return ''
  }
}

// ── Device icon components ────────────────────────────────────────────────────

function LaptopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function DeviceIcon({ os = '' }) {
  const mobile = /Android|iOS/i.test(os)
  return mobile ? <PhoneIcon /> : <LaptopIcon />
}

// ── Spinner (inline, used on per-row buttons while awaiting API) ──────────────

function Spinner() {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite', display: 'block' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

function DevicesSection() {
  const addAlert = useNotificationStore(s => s.addAlert)

  const [sessions,      setSessions]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadingIds,    setLoadingIds]    = useState(new Set())
  const [showLogoutAll, setShowLogoutAll] = useState(false)

  // The stable fingerprint of this browser tab — set once on mount.
  const currentDeviceId  = useRef(getCurrentDeviceId())
  // The MongoDB _id of the UserSession record that corresponds to this tab.
  // Resolved after the first successful fetch by matching deviceId.
  const currentSessionId = useRef(null)

  // ── Fetch helper ────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const res  = await getSessions()
      const list = res.data.sessions || []
      setSessions(list)

      // Identify which session belongs to THIS tab so we can:
      //   1. Show "This Device" label.
      //   2. Match it against incoming forceLogout socket events.
      if (currentDeviceId.current) {
        const mine = list.find(s => s.deviceId === currentDeviceId.current)
        currentSessionId.current = mine?._id?.toString() || null
      }
    } catch {
      // Silently fail — empty list is a safe fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Socket listeners ────────────────────────────────────────────────────────
  //
  // Rule from Phase 2 spec: always call socket.off(event) before socket.on(event)
  // to prevent duplicate listeners when the component re-mounts (e.g. tab switch).
  //
  useEffect(() => {
    // deviceListUpdated — another device was added/removed; refresh the list.
    socket.off('deviceListUpdated').on('deviceListUpdated', () => {
      load()
    })

    // forceLogout — one or all sessions have been revoked by the user (or an admin).
    socket.off('forceLogout').on('forceLogout', ({ targetAll, sessionId } = {}) => {
      if (targetAll) {
        // Every open tab for this user must log out immediately.
        useAuthStore.getState().forceLogout()
        return
      }

      // Targeted logout: only the tab whose session matches should log out.
      //
      // We compare against two identifiers:
      //   • sessionId (opaque hex string) — the primary match used by the backend.
      //   • currentSessionId.current    — the MongoDB _id, used as fallback if
      //     the backend emits the _id instead of the sessionId field.
      //
      if (
        sessionId &&
        currentSessionId.current &&
        (
          sessionId === currentSessionId.current ||
          // Some payloads use the Mongoose _id string directly; handle both
          sessionId === currentSessionId.current.toString()
        )
      ) {
        useAuthStore.getState().forceLogout()
      }
    })

    return () => {
      socket.off('deviceListUpdated')
      socket.off('forceLogout')
    }
  }, [])

  // ── Per-session loading state helpers ───────────────────────────────────────
  const addLoading    = (id) => setLoadingIds(prev => new Set(prev).add(id))
  const removeLoading = (id) => setLoadingIds(prev => { const next = new Set(prev); next.delete(id); return next })

  // ── Revoke a specific session (force-logout the target device) ──────────────
  const handleRevoke = async (session) => {
    const id = session._id

    // Safety guard: do not let the user log out themselves from this button.
    // They should use the main Logout button in the nav for that.
    if (session.deviceId && session.deviceId === currentDeviceId.current) {
      addAlert({ message: 'Use the main logout button to log out this device.', type: 'info' })
      return
    }

    addLoading(id)
    try {
      await forceLogoutDevice(id)
      // Optimistically remove from local list — socket event will also arrive
      // but the UI is already consistent.
      setSessions(prev => prev.filter(s => s._id !== id))
      addAlert({ message: 'Device logged out', type: 'success' })
    } catch {
      addAlert({ message: 'Failed to log out device', type: 'error' })
    } finally {
      removeLoading(id)
    }
  }

  // ── Revoke all sessions ─────────────────────────────────────────────────────
  //
  // Calls deleteAllSessions() which also emits forceLogout { targetAll: true }
  // via socket, so this tab itself will be force-logged out automatically.
  // We still clear local state to prevent a flash of the old list.
  const handleRevokeAll = async () => {
    try {
      await deleteAllSessions()
      setSessions([])
      addAlert({ message: 'All sessions revoked', type: 'success' })
    } catch {
      addAlert({ message: 'Failed to revoke all sessions', type: 'error' })
    } finally {
      setShowLogoutAll(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
          Active Devices
        </div>

        {/* ── Loading skeletons ── */}
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

          /* ── Empty state ── */
          <div className="settings-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            </svg>
            <div>No active sessions</div>
          </div>

        ) : (

          /* ── Session rows ── */
          sessions.map(session => {
            const isCurrentDevice = !!(
              session.deviceId &&
              currentDeviceId.current &&
              session.deviceId === currentDeviceId.current
            )
            const isLoadingThis = loadingIds.has(session._id)

            return (
              <div
                key={session._id}
                className="settings-device-item"
                style={isCurrentDevice ? { borderLeft: '3px solid var(--color-primary, #6366f1)', paddingLeft: 12 } : {}}
              >
                {/* Device icon — phone for mobile OS, laptop otherwise */}
                <div className="settings-device-icon">
                  <DeviceIcon os={session.os || session.device || ''} />
                </div>

                {/* Device info */}
                <div className="settings-device-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="settings-device-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Prefer separate browser + os fields (Phase 2); fall back to
                        the combined 'device' string (Phase 1 sessions). */}
                    {session.browser && session.os
                      ? `${session.browser} on ${session.os}`
                      : session.device || 'Unknown Device'}

                    {isCurrentDevice && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 99,
                        background: 'var(--color-primary-light, rgba(99,102,241,0.15))',
                        color: 'var(--color-primary, #6366f1)',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                      }}>
                        This Device
                      </span>
                    )}
                  </div>

                  <div className="settings-device-meta" style={{ marginTop: 2 }}>
                    {session.ip && (
                      <span style={{ opacity: 0.7 }}>{session.ip}&nbsp;·&nbsp;</span>
                    )}
                    {formatRelativeTime(session.lastActive)}
                  </div>
                </div>

                {/* Logout button */}
                <button
                  className="settings-btn danger"
                  style={{
                    minWidth: 74,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    opacity: isCurrentDevice || isLoadingThis ? 0.45 : 1,
                    cursor: isCurrentDevice || isLoadingThis ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isCurrentDevice || isLoadingThis}
                  onClick={() => handleRevoke(session)}
                  title={isCurrentDevice ? 'Use the main logout button to log out this device' : 'Log out this device'}
                >
                  {isLoadingThis ? <Spinner /> : 'Logout'}
                </button>
              </div>
            )
          })
        )}

        {/* ── Logout All button ── */}
        {sessions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              className="settings-btn danger"
              style={{ width: '100%' }}
              onClick={() => setShowLogoutAll(true)}
            >
              Logout All Devices
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm modal ── */}
      {showLogoutAll && (
        <ConfirmModal
          title="Logout All Devices"
          message="All active sessions will be immediately terminated, including this device."
          confirmLabel="Logout All"
          onConfirm={handleRevokeAll}
          onCancel={() => setShowLogoutAll(false)}
        />
      )}
    </>
  )
}

export default DevicesSection
