import { ArrowLeft, Bell, MessageCircle, Users, UserPlus } from 'lucide-react'
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

const typeIconMap = {
  message: <MessageCircle size={13} />,
  group:   <Users        size={13} />,
  system:  <Bell         size={13} />,
  request: <UserPlus     size={13} />,
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
      <div className='notif-panel-backdrop' onClick={onClose} />

      {/* Panel */}
      <div className='notif-panel'>

        {/* Header */}
        <div className='notif-header'>
          <div className='notif-header-left'>
            <button className='btn btn-ghost btn-icon' onClick={onClose} aria-label='Close notifications'>
              <ArrowLeft size={20} />
            </button>
            <span className='notif-title'>Notifications</span>
            {unreadNotifications > 0 && (
              <span className='notif-header-badge'>{unreadNotifications}</span>
            )}
          </div>
          <div className='notif-header-right'>
            {unreadNotifications > 0 && (
              <button className='btn btn-ghost btn-sm' style={{ color: 'var(--color-primary)', fontSize: 12 }} onClick={markAllRead}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className='btn btn-ghost btn-sm' style={{ color: 'var(--color-text-muted)', fontSize: 12 }} onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className='notif-list'>
          {notifications.length === 0 ? (
            <div className='notif-empty'>
              <Bell size={40} style={{ opacity: 0.25, color: 'var(--color-text-dim)' }} />
              <p className='notif-empty-text'>No notifications yet</p>
              <p className='notif-empty-sub'>You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map(n => {
              const isUnread = !n.isRead && !n.read
              return (
                <div
                  key={n.id}
                  className={`notif-item${isUnread ? ' unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  {/* Avatar */}
                  <div className='notif-avatar-wrap'>
                    <img
                      src={n.avatar || generateAvatar(n.title || 'U')}
                      alt={n.title}
                      className='notif-avatar'
                    />
                    <span className='notif-type-badge'>
                      {typeIconMap[n.type] || <Bell size={13} />}
                    </span>
                  </div>

                  {/* Content */}
                  <div className='notif-content'>
                    <div className='notif-row'>
                      <span className={`notif-item-title${isUnread ? ' bold' : ''}`}>
                        {n.title}
                      </span>
                      <span className='notif-item-time'>
                        {timeAgo(n.timestamp || n.createdAt)}
                      </span>
                    </div>
                    <p className={`notif-item-body${isUnread ? ' unread-body' : ''}`}>
                      {n.body}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isUnread && <span className='notif-unread-dot' />}
                </div>
              )
            })
          )}
        </div>

      </div>
    </>
  )
}

export default NotificationPanel