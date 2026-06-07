import { useNotification } from '../hooks/useNotification'
import { generateAvatar } from '../utils/generateAvatar'

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const typeIcon = {
  message: '💬',
  group:   '👥',
  system:  '🔔',
  request: '📩',
}

function NotificationPanel({ onClose }) {
  const {
    notifications,
    unreadNotifications,
    markAllRead,
    markNotificationRead,
    clearAll,
  } = useNotification()

  const handleItemClick = (n) => {
    if (!n.isRead && !n.read) markNotificationRead(n.id)
  }

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.backBtn} onClick={onClose}>←</button>
            <span style={s.headerTitle}>Notifications</span>
            {unreadNotifications > 0 && (
              <span style={s.headerBadge}>{unreadNotifications}</span>
            )}
          </div>
          <div style={s.headerRight}>
            {unreadNotifications > 0 && (
              <button style={s.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button style={s.clearBtn} onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={s.list}>
          {notifications.length === 0 ? (
            <div style={s.empty}>
              <span style={s.emptyIcon}>🔔</span>
              <p style={s.emptyText}>No notifications yet</p>
              <p style={s.emptySubtext}>You're all caught up!</p>
            </div>
          ) : (
            notifications.map(n => {
              const isUnread = !n.isRead && !n.read
              return (
                <div
                  key={n.id}
                  style={{
                    ...s.item,
                    backgroundColor: isUnread
                      ? 'var(--color-primary-light)'
                      : 'transparent',
                  }}
                  onClick={() => handleItemClick(n)}
                  onMouseEnter={e =>
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.backgroundColor = isUnread
                      ? 'var(--color-primary-light)'
                      : 'transparent'
                  }
                >
                  {/* Avatar */}
                  <div style={s.avatarWrap}>
                    <img
                      src={n.avatar || generateAvatar(n.title || 'U')}
                      alt={n.title}
                      style={s.avatar}
                    />
                    <span style={s.typeIcon}>{typeIcon[n.type] || '🔔'}</span>
                  </div>

                  {/* Content */}
                  <div style={s.content}>
                    <div style={s.itemTop}>
                      <span style={{
                        ...s.itemTitle,
                        fontWeight: isUnread ? 700 : 500,
                      }}>
                        {n.title}
                      </span>
                      <span style={s.itemTime}>{timeAgo(n.timestamp || n.createdAt)}</span>
                    </div>
                    <p style={{
                      ...s.itemBody,
                      color: isUnread ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}>
                      {n.body}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isUnread && <span style={s.unreadDot} />}
                </div>
              )
            })
          )}
        </div>

      </div>
    </>
  )
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    zIndex: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'fixed',
    top: 0, left: 0,
    width: '360px', height: '100vh',
    zIndex: 151,
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
    animation: 'slideInLeft 0.2s ease',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    backgroundColor: 'var(--color-header-bg)',
    borderBottom: '1px solid var(--color-divider)',
    minHeight: 59,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  headerRight: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  backBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-text)',
    fontSize: 20, cursor: 'pointer',
    padding: '4px 6px', borderRadius: 6, lineHeight: 1,
  },
  headerTitle: {
    fontSize: 16, fontWeight: 700,
    color: 'var(--color-text)',
  },
  headerBadge: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: 11, fontWeight: 700,
    borderRadius: 20, padding: '2px 7px',
    lineHeight: '18px',
  },
  markAllBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-primary)',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px', borderRadius: 6,
  },
  clearBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: 12, cursor: 'pointer',
    padding: '4px 8px', borderRadius: 6,
  },
  list: { flex: 1, overflowY: 'auto' },
  empty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: 8,
    padding: 40, marginTop: 60,
  },
  emptyIcon: { fontSize: 40, opacity: 0.3 },
  emptyText: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)' },
  emptySubtext: { fontSize: 13, color: 'var(--color-text-muted)' },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--color-divider)',
    transition: 'background-color 0.12s ease',
    position: 'relative',
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 46, height: 46,
    borderRadius: '50%', objectFit: 'cover',
  },
  typeIcon: {
    position: 'absolute', bottom: -2, right: -2,
    fontSize: 13,
    backgroundColor: 'var(--color-surface)',
    borderRadius: '50%', lineHeight: 1, padding: 1,
  },
  content: { flex: 1, minWidth: 0 },
  itemTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14, color: 'var(--color-text)',
    whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', maxWidth: 180,
  },
  itemTime: {
    fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0,
  },
  itemBody: {
    fontSize: 13, lineHeight: 1.4, margin: 0,
    whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  unreadDot: {
    width: 9, height: 9, borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    flexShrink: 0, marginTop: 6,
  },
}

export default NotificationPanel