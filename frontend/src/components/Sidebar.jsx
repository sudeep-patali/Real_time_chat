import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useUiStore } from '../store/uiStore'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useGroupInviteStore } from '../store/groupInviteStore'
import { generateAvatar } from '../utils/generateAvatar'
import { formatDate } from '../utils/formatDate'
import OnlineUsers from './OnlineUsers'
import NotificationPanel from './NotificationPanel'
import '../styles/sidebar.css'

function getLastMessagePreview(lastMessage) {
  if (!lastMessage) return 'No messages yet'
  const { type, content, fileName } = lastMessage
  switch (type) {
    case 'image':    return '📷 Photo'
    case 'gif':      return '🎞️ GIF'
    case 'video':    return '🎥 Video'
    case 'audio':    return '🎤 Voice message'
    case 'file':
    case 'document': {
      const name = fileName
        || (content && !content.startsWith('http') ? content : null)
        || (content ? content.split('/').pop().split('?')[0] : null)
        || 'File'
      return `📎 ${name}`
    }
    default: return content || 'No messages yet'
  }
}

function Sidebar() {
  const navigate       = useNavigate()
  const rooms          = useChatStore(state => state.rooms)
  const pendingRooms   = useChatStore(state => state.pendingRooms)
  const activeRoomId   = useChatStore(state => state.activeRoomId)
  const setActiveRoom  = useChatStore(state => state.setActiveRoom)
  const onlineUsers    = useChatStore(state => state.onlineUsers)
  const unreadCounts   = useNotificationStore(state => state.unreadCounts)
  const clearUnread    = useNotificationStore(state => state.clearUnread)
  const isSidebarOpen  = useUiStore(state => state.isSidebarOpen)
  const closeSidebar   = useUiStore(state => state.closeSidebar)
  const { currentUser, logout } = useAuth()
  const { unreadNotifications } = useNotification()
  const groupInvitations = useGroupInviteStore(state => state.invitations)

  const [showMenu,          setShowMenu]          = useState(false)
  const [showAvatarPreview, setShowAvatarPreview] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery,       setSearchQuery]       = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  // ── Auto-clear unread when entering a room ────────────────────────────
  const handleRoomClick = (room) => {
    const rid = room.id || room._id
    setActiveRoom(rid)
    clearUnread(rid?.toString())           // immediately clear badge
    navigate(room.isGroup ? `/group/${rid}` : `/chat/${rid}`)
    closeSidebar()
  }

  const handleProfile  = () => { setShowMenu(false); navigate('/profile') }
  const handleSettings = () => { setShowMenu(false); navigate('/settings') }
  const handleLogout   = () => { setShowMenu(false); logout() }

  const avatarSrc = currentUser?.avatar || generateAvatar(currentUser?.name || 'U')

  const getRoomDisplayName = (room) => {
    if (room.isGroup) return room.groupName || 'Group'
    if (room.otherUser?.name) return room.otherUser.name
    const other = room.participantIds?.find(p => {
      const pid = p?.id || p?._id || p
      return pid?.toString() !== currentUser?.id?.toString()
    })
    return other?.name || other?.email || 'Unknown User'
  }

  const isUserOnline = (room) => {
    if (room.isGroup) return false
    const other = room.participantIds?.find(p => {
      const pid = p?.id || p?._id || p
      return pid?.toString() !== currentUser?.id?.toString()
    })
    const otherId = other?.id || other?._id || (typeof other === 'string' ? other : null)
    return otherId ? onlineUsers.includes(otherId.toString()) : false
  }

  const filteredRooms = searchQuery.trim()
    ? rooms.filter(room => {
        const name = getRoomDisplayName(room).toLowerCase()
        const last = (room.lastMessage?.content || '').toLowerCase()
        const q    = searchQuery.trim().toLowerCase()
        return name.includes(q) || last.includes(q)
      })
    : rooms

  // Total unread across all rooms for title badge
  const totalRoomUnread = Object.values(unreadCounts).reduce((a, c) => a + (c || 0), 0)

  return (
    <>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>

        {/* ── Sidebar Header ─────────────────────────────────────────── */}
        <div className='sidebar-header'>
          <img src={avatarSrc} alt={currentUser?.name || 'You'} className='sidebar-header-avatar'
            title='View photo' onClick={() => setShowAvatarPreview(true)} style={{ cursor: 'pointer' }} />

          <div className='sidebar-header-actions'>

            <button className='sidebar-header-icon' title='New Chat' onClick={() => navigate('/find-people')}>
              ✏️
            </button>

            {/* Notification bell with badge */}
            <button className='sidebar-header-icon' title='Notifications'
              onClick={() => setShowNotifications(true)} style={{ position: 'relative' }}>
              🔔
              {unreadNotifications > 0 && (
                <span style={styles.bellBadge}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
              )}
            </button>

            {/* Three-dot menu */}
            <div ref={menuRef} style={styles.menuWrapper}>
              <button className='sidebar-header-icon' title='Menu' onClick={() => setShowMenu(p => !p)}>⋮</button>
              {showMenu && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownArrow} />
                  {[
                    { icon: '👤', label: 'Profile',      fn: handleProfile },
                    { icon: '⚙️', label: 'Settings',     fn: handleSettings },
                    { icon: '👥', label: 'Create Group',  fn: () => { setShowMenu(false); navigate('/create-group') } },
                  ].map(item => (
                    <button key={item.label} style={styles.menuItem} onClick={item.fn}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={styles.menuIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <div style={styles.divider} />
                  <button style={styles.menuItem} onClick={handleLogout}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)' }}>
                    <span style={styles.menuIcon}>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Avatar lightbox ────────────────────────────────────────── */}
        {showAvatarPreview && (
          <div style={styles.lightboxOverlay} onClick={() => setShowAvatarPreview(false)}>
            <div style={styles.lightboxBox} onClick={e => e.stopPropagation()}>
              <div style={styles.lightboxTopBar}>
                <button style={styles.lightboxBackBtn} onClick={() => setShowAvatarPreview(false)}>← Back</button>
                <span style={styles.lightboxTitle}>Profile Photo</span>
                <button style={styles.lightboxCloseBtn} onClick={() => setShowAvatarPreview(false)}>✕</button>
              </div>
              <p style={styles.lightboxName}>{currentUser?.name || 'You'}</p>
              <img src={avatarSrc} alt={currentUser?.name} style={styles.lightboxImg} />
            </div>
          </div>
        )}

        {/* ── Notification Panel ─────────────────────────────────────── */}
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

        {/* ── Search ────────────────────────────────────────────────── */}
        <div className='sidebar-search'>
          <div className='sidebar-search-inner'>
            <span className='sidebar-search-icon'>🔍</span>
            <input type='text' placeholder='Search or start new chat'
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              autoComplete='off' spellCheck={false} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Online Users ───────────────────────────────────────────── */}
        <OnlineUsers />

        {/* ── Message Requests ──────────────────────────────────────── */}
        {pendingRooms?.length > 0 && (
          <div style={styles.requestsSection} onClick={() => navigate('/requests')}>
            <span style={styles.requestsIcon}>📩</span>
            <div style={styles.requestsInfo}>
              <p style={styles.requestsTitle}>Message Requests</p>
              <p style={styles.requestsSub}>{pendingRooms.length} pending request{pendingRooms.length > 1 ? 's' : ''}</p>
            </div>
            <span style={styles.requestsBadge}>{pendingRooms.length}</span>
          </div>
        )}

        {/* ── Group Invitations ─────────────────────────────────────── */}
        {groupInvitations?.length > 0 && (
          <div style={styles.groupInvitesSection} onClick={() => navigate('/group-invitations')}>
            <span style={styles.requestsIcon}>👥</span>
            <div style={styles.requestsInfo}>
              <p style={styles.groupInvitesTitle}>Group Invitations</p>
              <p style={styles.requestsSub}>{groupInvitations.length} pending invitation{groupInvitations.length > 1 ? 's' : ''}</p>
            </div>
            <span style={styles.groupInvitesBadge}>{groupInvitations.length}</span>
          </div>
        )}

        {/* ── Conversation List ─────────────────────────────────────── */}
        <div className='room-list'>
          {rooms.length === 0 ? (
            <div className='sidebar-empty'>
              <span className='sidebar-empty-icon'>💬</span>
              <p>No conversations yet</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 4 }}>
                Click ✏️ to start a new chat
              </p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className='sidebar-empty'>
              <span className='sidebar-empty-icon'>🔍</span>
              <p>No results for "{searchQuery}"</p>
            </div>
          ) : (
            filteredRooms.map(room => {
              const rid       = room.id || room._id
              const name      = getRoomDisplayName(room)
              const avatar    = room.avatarUrl || generateAvatar(name)
              const unread    = unreadCounts[rid?.toString()] || 0
              const isActive  = activeRoomId === rid
              const online    = isUserOnline(room)

              return (
                <div key={rid}
                  className={`room-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                  onClick={() => handleRoomClick(room)}>

                  <div className='room-avatar-wrap'>
                    <img src={avatar} alt={name} className='room-avatar' />
                    {/* Online indicator for DMs */}
                    {!room.isGroup && (
                      <span className='room-online-dot'
                        style={{ background: online ? '#00a884' : 'transparent', border: online ? '2px solid var(--color-surface)' : 'none' }} />
                    )}
                    {room.isGroup && <span className='room-group-badge'>👥</span>}
                  </div>

                  <div className='room-info'>
                    <div className='room-header'>
                      <span className='room-name' style={{ fontWeight: unread > 0 ? 700 : 500 }}>{name}</span>
                      <span className='room-time'
                        style={{ color: unread > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)', fontWeight: unread > 0 ? 600 : 400 }}>
                        {formatDate(room.lastMessage?.timestamp || room.updatedAt)}
                      </span>
                    </div>
                    <div className='room-footer'>
                      <span className='room-last-msg'
                        style={{ fontWeight: unread > 0 ? 600 : 400, color: unread > 0 ? 'var(--color-text)' : 'var(--color-text-dim)' }}>
                        {room.isGroup && room.lastMessage?.senderName
                          ? `${room.lastMessage.senderName}: ${getLastMessagePreview(room.lastMessage)}`
                          : getLastMessagePreview(room.lastMessage)
                        }
                      </span>
                      {unread > 0 && (
                        <span className='unread-badge' style={{
                          background: room.isMuted ? 'var(--color-text-dim)' : 'var(--color-primary)',
                          animation: !room.isMuted ? 'badgePop 0.3s cubic-bezier(0.36,0.07,0.19,0.97)' : 'none',
                        }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      <style>{`
        @keyframes badgePop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  )
}

const styles = {
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '1px 4px', lineHeight: '14px', minWidth: 14, textAlign: 'center', pointerEvents: 'none' },
  menuWrapper: { position: 'relative' },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 180, overflow: 'hidden', animation: 'fadeSlideIn 0.15s ease' },
  dropdownArrow: { position: 'absolute', top: -6, right: 10, width: 12, height: 12, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRight: 'none', borderBottom: 'none', transform: 'rotate(45deg)' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: 14, cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.12s ease' },
  menuIcon: { fontSize: 15, flexShrink: 0 },
  divider: { height: 1, backgroundColor: 'var(--color-divider)' },
  requestsSection: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', backgroundColor: 'rgba(0,168,132,0.06)', borderBottom: '1px solid var(--color-divider)', transition: 'background 0.15s' },
  requestsIcon: { fontSize: 22, flexShrink: 0 },
  requestsInfo: { flex: 1, minWidth: 0 },
  requestsTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2 },
  requestsSub: { fontSize: 12, color: 'var(--color-text-muted)' },
  requestsBadge: { backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 20, minWidth: 20, height: 20, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupInvitesSection: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', backgroundColor: 'rgba(139,92,246,0.06)', borderBottom: '1px solid var(--color-divider)', transition: 'background 0.15s' },
  groupInvitesTitle: { fontSize: 14, fontWeight: 600, color: '#8b5cf6', marginBottom: 2 },
  groupInvitesBadge: { backgroundColor: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 20, minWidth: 20, height: 20, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lightboxOverlay: { position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeSlideIn 0.15s ease' },
  lightboxBox: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, backgroundColor: 'var(--color-surface)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: 280 },
  lightboxTopBar: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-header-bg)', boxSizing: 'border-box' },
  lightboxBackBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 },
  lightboxTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)' },
  lightboxCloseBtn: { background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 15, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, lineHeight: 1 },
  lightboxName: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '4px 0 0' },
  lightboxImg: { width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', margin: '0 32px 28px' },
}

export default Sidebar