import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useUiStore } from '../store/uiStore'
import { generateAvatar } from '../utils/generateAvatar'
import { useNavigate } from 'react-router-dom'
import NotificationPanel from './NotificationPanel'
import { useGroupInviteStore } from '../store/groupInviteStore'
import '../styles/navbar.css'

function Navbar() {
  const { currentUser, logout } = useAuth()
  const { totalUnread } = useNotification()
  const toggleSidebar = useUiStore(state => state.toggleSidebar)
  const navigate = useNavigate()

  const invitations = useGroupInviteStore(state => state.invitations)
  const pendingInvites = invitations.length
  const [showNotifications, setShowNotifications] = useState(false)

  const avatarSrc = currentUser?.avatar || generateAvatar(currentUser?.name || 'U')

  // Desktop navbar is hidden via navbar.css (display:none).
  // This renders only on mobile as a slim top bar.
  return (
    <>
      <nav className='navbar'>
        <div className='navbar-left'>
          <button className='hamburger' onClick={toggleSidebar} aria-label='Open menu'>
            ☰
          </button>
          <span className='navbar-logo'>WHEELTRIX</span>
        </div>

        <div className='navbar-right'>
          {/* Bell — opens NotificationPanel */}
          <button
            className='navbar-icon-btn'
            title='Notifications'
            onClick={() => setShowNotifications(true)}
            style={{ position: 'relative' }}
          >
            🔔
            {totalUnread > 0 && (
              <span className='badge'>{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </button>

          {/* Group invitations */}
          <button
            className='navbar-icon-btn'
            title='Group Invitations'
            onClick={() => navigate('/group-invitations')}
            style={{ position: 'relative' }}
          >
            👥
            {pendingInvites > 0 && (
              <span className='badge'>{pendingInvites > 9 ? '9+' : pendingInvites}</span>
            )}
          </button>

          {/* Settings */}
          <button
            className='navbar-icon-btn'
            title='Settings'
            onClick={() => navigate('/settings')}
          >
            ⚙️
          </button>

          {/* Avatar */}
          <div
            className='navbar-user'
            onClick={() => navigate('/profile')}
            title={currentUser?.name}
          >
            <img
              src={avatarSrc}
              alt={currentUser?.name}
              className='navbar-avatar'
            />
            <span className='navbar-username'>{currentUser?.name}</span>
          </div>

          {/* Logout */}
          <button className='navbar-logout' onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Notification panel — rendered outside nav so it covers full screen */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  )
}

export default Navbar