import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useNotificationStore } from '../store/notificationStore'
import { TOAST_DURATION } from '../utils/constants'

const typeConfig = {
  success: {
    icon: <CheckCircle size={16} />,
    borderColor: 'var(--color-success)',
    iconColor: 'var(--color-success)',
  },
  error: {
    icon: <XCircle size={16} />,
    borderColor: 'var(--color-error)',
    iconColor: 'var(--color-error)',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    borderColor: '#f59e0b',
    iconColor: '#f59e0b',
  },
  info: {
    icon: <Info size={16} />,
    borderColor: 'var(--color-primary)',
    iconColor: 'var(--color-primary)',
  },
}

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
    <div className="toast-container-top">
      {alerts.map(alert => {
        const config = typeConfig[alert.type] || typeConfig.info
        return (
          <div
            key={alert.id}
            className="toast-item"
            style={{ borderLeftColor: config.borderColor }}
          >
            <span className="toast-item-icon" style={{ color: config.iconColor }}>
              {config.icon}
            </span>
            <p className="toast-item-message">{alert.message}</p>
            <button
              className="toast-item-close btn-icon"
              onClick={() => removeAlert(alert.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toast