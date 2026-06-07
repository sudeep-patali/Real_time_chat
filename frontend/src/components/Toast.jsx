import { useEffect } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { TOAST_DURATION } from '../utils/constants'

function Toast() {
  const alerts = useNotificationStore(state => state.alerts)
  const removeAlert = useNotificationStore(state => state.removeAlert)

  useEffect(() => {
    if (alerts.length === 0) return
    const latest = alerts[alerts.length - 1]
    const timer = setTimeout(() => {
      removeAlert(latest.id)
    }, TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [alerts])

  if (alerts.length === 0) return null

  return (
    <div style={styles.container}>
      {alerts.map(alert => (
        <div
          key={alert.id}
          style={{
            ...styles.toast,
            borderLeft: `4px solid ${
              alert.type === 'error' ? 'var(--color-error)' :
              alert.type === 'success' ? 'var(--color-success)' :
              'var(--color-primary)'
            }`
          }}
        >
          <p style={styles.message}>{alert.message}</p>
          <button style={styles.close} onClick={() => removeAlert(alert.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toast: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '260px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  message: {
    color: 'var(--color-text)',
    fontSize: '13px',
  },
  close: {
    background: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    padding: '2px',
  }
}

export default Toast