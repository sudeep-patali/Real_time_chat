import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useUiStore } from '../store/uiStore'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { generateAvatar } from '../utils/generateAvatar'
import { formatDate } from '../utils/formatDate'
import OnlineUsers from './OnlineUsers'
import NotificationPanel from './NotificationPanel'
import '../styles/sidebar.css'

function Sidebar() {
  const navigate      = useNavigate()
  const rooms         = useChatStore(state => state.rooms)
  const activeRoomId  = useChatStore(state => state.activeRoomId)
  const setActiveRoom = useChatStore(state => state.setActiveRoom)
  const unreadCounts  = useNotificationStore(state => state.unreadCounts)
  const isSidebarOpen = useUiStore(state => state.isSidebarOpen)
  const closeSidebar  = useUiStore(state => state.closeSidebar)
  const { currentUser, logout } = useAuth()
  const { unreadNotifications } = useNotification()

  // Three-dot dropdown state
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Avatar image preview state
  const [showAvatarPreview, setShowAvatarPreview] = useState(false)

  // Notification panel state
  const [showNotifications, setShowNotifications] = useState(false)

  // Close three-dot dropdown when clicking outside
  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleRoomClick = (room) => {
    setActiveRoom(room.id)
    navigate(room.isGroup ? `/group/${room.id}` : `/chat/${room.id}`)
    closeSidebar()
  }

  const handleProfile = () => {
    setShowMenu(false)
    navigate('/profile')
  }

  const handleSettings = () => {
    setShowMenu(false)
    navigate('/settings')
  }

  const handleLogout = () => {
    setShowMenu(false)
    logout()
  }

  const avatarSrc = currentUser?.avatar || generateAvatar(currentUser?.name || 'U')

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>

        {/* ── Sidebar Header ── */}
        <div className='sidebar-header'>

          {/* Avatar — click opens full image preview */}
          <img
            src={avatarSrc}
            alt={currentUser?.name || 'You'}
            className='sidebar-header-avatar'
            title='View photo'
            onClick={() => setShowAvatarPreview(true)}
            style={{ cursor: 'pointer' }}
          />

          <div className='sidebar-header-actions'>

            {/* Notification bell — opens NotificationPanel */}
            <button
              className='sidebar-header-icon'
              title='Notifications'
              onClick={() => setShowNotifications(true)}
              style={{ position: 'relative' }}
            >
              🔔
              {unreadNotifications > 0 && (
                <span style={styles.bellBadge}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* Three-dot — opens Profile / Settings / Logout dropdown */}
            <div ref={menuRef} style={styles.menuWrapper}>
              <button
                className='sidebar-header-icon'
                title='Menu'
                onClick={() => setShowMenu(p => !p)}
              >
                ⋮
              </button>

              {showMenu && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownArrow} />

                  {/* Profile */}
                  <button
                    style={styles.menuItem}
                    onClick={handleProfile}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={styles.menuIcon}>👤</span>
                    <span>Profile</span>
                  </button>

                  {/* Settings */}
                  <button
                    style={styles.menuItem}
                    onClick={handleSettings}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={styles.menuIcon}>⚙️</span>
                    <span>Settings</span>
                  </button>

                  <div style={styles.divider} />

                  {/* Logout */}
                  <button
                    style={styles.menuItem}
                    onClick={handleLogout}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }}
                  >
                    <span style={styles.menuIcon}>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Avatar Image Preview Lightbox ── */}
        {showAvatarPreview && (
          <div style={styles.lightboxOverlay} onClick={() => setShowAvatarPreview(false)}>
            <div style={styles.lightboxBox} onClick={e => e.stopPropagation()}>

              {/* Top bar: back button + title + close */}
              <div style={styles.lightboxTopBar}>
                <button
                  style={styles.lightboxBackBtn}
                  onClick={() => setShowAvatarPreview(false)}
                  title='Back'
                >
                  ← Back
                </button>
                <span style={styles.lightboxTitle}>Profile Photo</span>
                <button
                  style={styles.lightboxCloseBtn}
                  onClick={() => setShowAvatarPreview(false)}
                  title='Close'
                >
                  ✕
                </button>
              </div>

              <p style={styles.lightboxName}>{currentUser?.name || 'You'}</p>
              <img src={avatarSrc} alt={currentUser?.name} style={styles.lightboxImg} />
            </div>
          </div>
        )}

        {/* ── Notification Panel ── */}
        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}

        {/* ── Search ── */}
        <div className='sidebar-search'>
          <div className='sidebar-search-inner'>
            <span className='sidebar-search-icon'>🔍</span>
            <input type='text' placeholder='Search or start new chat' />
          </div>
        </div>

        {/* ── Online Users ── */}
        <OnlineUsers />

        {/* ── Conversation List ── */}
        <div className='room-list'>
          {rooms.length === 0 ? (
            <div className='sidebar-empty'>
              <span className='sidebar-empty-icon'>💬</span>
              <p>No conversations yet</p>
            </div>
          ) : (
            rooms.map(room => {
              const name       = room.isGroup ? room.groupName : `User ${room.participantIds?.[1] ?? ''}`
              const roomAvatar = room.avatarUrl || generateAvatar(name)
              const unread     = unreadCounts[room.id] || 0
              const isActive   = activeRoomId === room.id

              return (
                <div
                  key={room.id}
                  className={`room-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                  onClick={() => handleRoomClick(room)}
                >
                  <div className='room-avatar-wrap'>
                    <img src={roomAvatar} alt={name} className='room-avatar' />
                    {!room.isGroup && <span className='room-online-dot' />}
                    {room.isGroup && <span className='room-group-badge'>👥</span>}
                  </div>

                  <div className='room-info'>
                    <div className='room-header'>
                      <span className='room-name'>{name}</span>
                      <span className='room-time'>{formatDate(room.lastMessage?.timestamp)}</span>
                    </div>
                    <div className='room-footer'>
                      <span className='room-last-msg'>
                        {room.isGroup && room.lastMessage?.senderName
                          ? `${room.lastMessage.senderName}: ${room.lastMessage.content}`
                          : room.lastMessage?.content || 'No messages yet'
                        }
                      </span>
                      {unread > 0 && (
                        <span className='unread-badge'>{unread > 99 ? '99+' : unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </>
  )
}

const styles = {
  /* Bell badge */
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 20,
    padding: '1px 4px',
    lineHeight: '14px',
    minWidth: 14,
    textAlign: 'center',
    pointerEvents: 'none',
  },

  /* Three-dot dropdown */
  menuWrapper: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    zIndex: 200,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    minWidth: '180px',
    overflow: 'hidden',
    animation: 'fadeSlideIn 0.15s ease',
  },
  dropdownArrow: {
    position: 'absolute',
    top: '-6px',
    right: '10px',
    width: 12,
    height: 12,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRight: 'none',
    borderBottom: 'none',
    transform: 'rotate(45deg)',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.12s ease',
  },
  menuIcon: {
    fontSize: 15,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--color-divider)',
  },

  /* Avatar lightbox */
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeSlideIn 0.15s ease',
  },
  lightboxBox: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'var(--color-surface)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    minWidth: 280,
  },
  lightboxTopBar: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-divider)',
    backgroundColor: 'var(--color-header-bg)',
    boxSizing: 'border-box',
  },
  lightboxBackBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  lightboxCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: 15,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
    lineHeight: 1,
  },
  lightboxName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: '4px 0 0',
  },
  lightboxImg: {
    width: 200,
    height: 200,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--color-primary)',
    margin: '0 32px 28px',
  },
}

export default Sidebar