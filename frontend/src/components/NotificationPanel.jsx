import { useNotification } from '../hooks/useNotification'
import { generateAvatar } from '../utils/generateAvatar'

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const typeIcon = {
  message: '💬',
  group:   '👥',
  system:  '🔔',
}

function NotificationPanel({ onClose }) {
  const {
    notifications,
    unreadNotifications,
    markAllRead,
    markNotificationRead,
  } = useNotification()

  const handleItemClick = (n) => {
    if (!n.read) markNotificationRead(n.id)
  }

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={styles.panel}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={onClose} title='Back'>
              ←
            </button>
            <span style={styles.headerTitle}>Notifications</span>
            {unreadNotifications > 0 && (
              <span style={styles.headerBadge}>{unreadNotifications}</span>
            )}
          </div>
          {unreadNotifications > 0 && (
            <button style={styles.markAllBtn} onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={styles.list}>
          {notifications.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>🔔</span>
              <p style={styles.emptyText}>No notifications yet</p>
              <p style={styles.emptySubtext}>You're all caught up!</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  ...styles.item,
                  backgroundColor: n.read ? 'transparent' : 'var(--color-surface-2)',
                }}
                onClick={() => handleItemClick(n)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'var(--color-surface-2)'}
              >
                {/* Avatar */}
                <div style={styles.avatarWrap}>
                  <img
                    src={n.avatar || generateAvatar(n.title)}
                    alt={n.title}
                    style={styles.avatar}
                  />
                  <span style={styles.typeIcon}>{typeIcon[n.type] || '🔔'}</span>
                </div>

                {/* Content */}
                <div style={styles.content}>
                  <div style={styles.itemTop}>
                    <span style={{
                      ...styles.itemTitle,
                      fontWeight: n.read ? 500 : 700,
                    }}>
                      {n.title}
                    </span>
                    <span style={styles.itemTime}>{timeAgo(n.timestamp)}</span>
                  </div>
                  <p style={{
                    ...styles.itemBody,
                    color: n.read ? 'var(--color-text-muted)' : 'var(--color-text)',
                  }}>
                    {n.body}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && <span style={styles.unreadDot} />}
              </div>
            ))
          )}
        </div>

      </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '360px',
    height: '100vh',
    zIndex: 151,
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
    animation: 'slideInLeft 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px',
    backgroundColor: 'var(--color-header-bg)',
    borderBottom: '1px solid var(--color-divider)',
    minHeight: 60,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: 20,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
    lineHeight: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  headerBadge: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 20,
    padding: '2px 7px',
    lineHeight: '18px',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--color-divider)',
    transition: 'background-color 0.12s ease',
    position: 'relative',
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  typeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 13,
    backgroundColor: 'var(--color-surface)',
    borderRadius: '50%',
    lineHeight: 1,
    padding: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 180,
  },
  itemTime: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    flexShrink: 0,
    marginTop: 6,
  },
}

export default NotificationPanel