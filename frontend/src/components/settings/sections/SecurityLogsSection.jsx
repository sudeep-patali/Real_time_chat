import { useState, useEffect } from 'react'
import { getSecurityLogs } from '../../../services/settingsService'

const ACTION_LABELS = {
  login:            { label: 'Logged In',        icon: '🔓' },
  logout:           { label: 'Logged Out',        icon: '🔒' },
  password_changed: { label: 'Password Changed',  icon: '🔑' },
  new_device:       { label: 'New Device Login',  icon: '📱' },
  '2fa_enabled':    { label: '2FA Enabled',       icon: '🛡️' },
  '2fa_disabled':   { label: '2FA Disabled',      icon: '⚠️' },
}

function formatDate(d) {
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function SecurityLogsSection() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSecurityLogs()
      .then(r => setLogs(r.data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Security Logs
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} className="settings-log-item">
              <div className="settings-skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="settings-skeleton" style={{ height: 13, marginBottom: 5, width: '50%' }} />
                <div className="settings-skeleton" style={{ height: 11, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="settings-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div>No security events recorded</div>
        </div>
      ) : (
        logs.map(log => {
          const info = ACTION_LABELS[log.action] || { label: log.action, icon: '📋' }
          return (
            <div key={log._id} className="settings-log-item">
              <div className="settings-log-icon" style={{ fontSize: 16 }}>
                {info.icon}
              </div>
              <div>
                <div className="settings-log-action">{info.label}</div>
                <div className="settings-log-meta">
                  {formatDate(log.createdAt)}
                  {log.device && ` · ${log.device}`}
                  {log.ip && ` · ${log.ip}`}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export default SecurityLogsSection