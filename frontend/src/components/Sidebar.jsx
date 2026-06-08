import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquarePlus,
  Bell,
  MoreVertical,
  Search,
  X,
  ArrowLeft,
  User,
  Settings,
  Users,
  LogOut,
  UserPlus,
  ImageIcon,
  Video,
  Mic,
  Paperclip,
  Film,
  MessageCircle,
} from 'lucide-react'
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
    case 'image':    return { icon: 'image',  text: 'Photo' }
    case 'gif':      return { icon: 'gif',    text: 'GIF' }
    case 'video':    return { icon: 'video',  text: 'Video' }
    case 'audio':    return { icon: 'audio',  text: 'Voice message' }
    case 'file':
    case 'document': {
      const name = fileName
        || (content && !content.startsWith('http') ? content : null)
        || (content ? content.split('/').pop().split('?')[0] : null)
        || 'File'
      return { icon: 'file', text: `File: ${name}` }
    }
    default: return content || 'No messages yet'
  }
}

function PreviewContent({ preview }) {
  if (!preview || typeof preview === 'string') {
    return <span>{preview}</span>
  }
  const iconMap = {
    image: <ImageIcon size={12} />,
    gif:   <Film size={12} />,
    video: <Video size={12} />,
    audio: <Mic size={12} />,
    file:  <Paperclip size={12} />,
  }
  return (
    <>
      <span className='room-preview-icon'>{iconMap[preview.icon]}</span>
      <span>{preview.text}</span>
    </>
  )
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
    clearUnread(rid?.toString())
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
          <img
            src={avatarSrc}
            alt={currentUser?.name || 'You'}
            className='sidebar-header-avatar'
            title='View photo'
            onClick={() => setShowAvatarPreview(true)}
          />

          <div className='sidebar-header-actions'>

            <button
              className='sidebar-header-icon'
              title='New Chat'
              onClick={() => navigate('/find-people')}
            >
              <MessageSquarePlus size={20} />
            </button>

            {/* Notification bell with badge */}
            <button
              className='sidebar-header-icon sidebar-bell-btn'
              title='Notifications'
              onClick={() => setShowNotifications(true)}
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className='sidebar-bell-badge'>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* Three-dot menu */}
            <div ref={menuRef} className='sidebar-menu-wrap'>
              <button
                className='sidebar-header-icon'
                title='Menu'
                onClick={() => setShowMenu(p => !p)}
              >
                <MoreVertical size={20} />
              </button>

              {showMenu && (
                <div className='dropdown-menu sidebar-dropdown'>
                  <button className='dropdown-item' onClick={handleProfile}>
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button className='dropdown-item' onClick={handleSettings}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    className='dropdown-item'
                    onClick={() => { setShowMenu(false); navigate('/create-group') }}
                  >
                    <Users size={16} />
                    <span>Create Group</span>
                  </button>
                  <div className='dropdown-separator' />
                  <button className='dropdown-item danger' onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Avatar lightbox ────────────────────────────────────────── */}
        {showAvatarPreview && (
          <div className='sidebar-lightbox-overlay' onClick={() => setShowAvatarPreview(false)}>
            <div className='sidebar-lightbox-box' onClick={e => e.stopPropagation()}>
              <div className='sidebar-lightbox-topbar'>
                <button
                  className='btn btn-ghost btn-sm'
                  onClick={() => setShowAvatarPreview(false)}
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <span className='sidebar-lightbox-name' style={{ fontWeight: 600 }}>Profile Photo</span>
                <button
                  className='btn btn-ghost btn-icon-sm'
                  onClick={() => setShowAvatarPreview(false)}
                  aria-label='Close'
                >
                  <X size={18} />
                </button>
              </div>
              <p className='sidebar-lightbox-username'>{currentUser?.name || 'You'}</p>
              <img
                src={avatarSrc}
                alt={currentUser?.name}
                className='sidebar-lightbox-img'
              />
            </div>
          </div>
        )}

        {/* ── Notification Panel ─────────────────────────────────────── */}
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

        {/* ── Search ────────────────────────────────────────────────── */}
        <div className='sidebar-search'>
          <div className='sidebar-search-inner'>
            <span className='sidebar-search-icon'>
              <Search size={15} />
            </span>
            <input
              type='text'
              placeholder='Search or start new chat'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete='off'
              spellCheck={false}
            />
            {searchQuery && (
              <button
                className='sidebar-search-clear'
                onClick={() => setSearchQuery('')}
                aria-label='Clear search'
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Online Users ───────────────────────────────────────────── */}
        <OnlineUsers />

        {/* ── Message Requests ──────────────────────────────────────── */}
        {pendingRooms?.length > 0 && (
          <div
            className='sidebar-requests-row requests'
            onClick={() => navigate('/requests')}
          >
            <span className='sidebar-requests-row-icon'>
              <UserPlus size={20} />
            </span>
            <div className='sidebar-requests-info'>
              <p className='sidebar-requests-title requests'>Message Requests</p>
              <p className='sidebar-requests-sub'>
                {pendingRooms.length} pending request{pendingRooms.length > 1 ? 's' : ''}
              </p>
            </div>
            <span className='sidebar-badge-primary'>{pendingRooms.length}</span>
          </div>
        )}

        {/* ── Group Invitations ─────────────────────────────────────── */}
        {groupInvitations?.length > 0 && (
          <div
            className='sidebar-requests-row invites'
            onClick={() => navigate('/group-invitations')}
          >
            <span className='sidebar-requests-row-icon'>
              <Users size={20} />
            </span>
            <div className='sidebar-requests-info'>
              <p className='sidebar-requests-title invites'>Group Invitations</p>
              <p className='sidebar-requests-sub'>
                {groupInvitations.length} pending invitation{groupInvitations.length > 1 ? 's' : ''}
              </p>
            </div>
            <span className='sidebar-badge-purple'>{groupInvitations.length}</span>
          </div>
        )}

        {/* ── Conversation List ─────────────────────────────────────── */}
        <div className='room-list'>
          {rooms.length === 0 ? (
            <div className='sidebar-empty'>
              <span className='sidebar-empty-icon'>
                <MessageCircle size={40} strokeWidth={1.5} />
              </span>
              <p>No conversations yet</p>
              <p className='sidebar-empty-hint'>
                Tap the pencil icon to start a new chat
              </p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className='sidebar-empty'>
              <span className='sidebar-empty-icon'>
                <Search size={40} strokeWidth={1.5} />
              </span>
              <p>No results for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            filteredRooms.map(room => {
              const rid      = room.id || room._id
              const name     = getRoomDisplayName(room)
              const avatar   = room.isGroup
                ? (room.groupAvatar || room.avatarUrl || generateAvatar(name))
                : (room.otherUser?.avatar || room.avatarUrl || generateAvatar(name))
              const unread   = unreadCounts[rid?.toString()] || 0
              const isActive = activeRoomId === rid
              const online   = isUserOnline(room)
              const preview  = getLastMessagePreview(room.lastMessage)

              return (
                <div
                  key={rid}
                  className={`room-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                  onClick={() => handleRoomClick(room)}
                >
                  <div className='room-avatar-wrap'>
                    <img src={avatar} alt={name} className='room-avatar' />
                    {!room.isGroup && (
                      <span
                        className='room-online-dot'
                        style={{
                          background: online ? '#00a884' : 'transparent',
                          border: online ? '2px solid var(--color-surface)' : 'none',
                        }}
                      />
                    )}
                    {room.isGroup && (
                      <span className='room-group-badge'>
                        <Users size={9} />
                      </span>
                    )}
                  </div>

                  <div className='room-info'>
                    <div className='room-header'>
                      <span className={`room-name ${unread > 0 ? 'room-name--bold' : ''}`}>
                        {name}
                      </span>
                      <span className={`room-time ${unread > 0 ? 'room-time--unread' : ''}`}>
                        {formatDate(room.lastMessage?.timestamp || room.updatedAt)}
                      </span>
                    </div>
                    <div className='room-footer'>
                      <span className={`room-last-msg ${unread > 0 ? 'room-last-msg--unread' : ''}`}>
                        {room.isGroup && room.lastMessage?.senderName
                          ? (
                            <>
                              <span>{room.lastMessage.senderName}: </span>
                              <PreviewContent preview={preview} />
                            </>
                          )
                          : <PreviewContent preview={preview} />
                        }
                      </span>
                      {unread > 0 && (
                        <span
                          className='unread-badge'
                          style={{
                            background: room.isMuted ? 'var(--color-text-dim)' : 'var(--color-primary)',
                            animation: !room.isMuted ? 'badgePop 0.3s cubic-bezier(0.36,0.07,0.19,0.97)' : 'none',
                          }}
                        >
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

export default Sidebar