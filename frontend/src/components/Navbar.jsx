import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../hooks/useNotification'
import { useUiStore } from '../store/uiStore'
import { useGroupInviteStore } from '../store/groupInviteStore'
import { generateAvatar } from '../utils/generateAvatar'
import NotificationPanel from './NotificationPanel'
import '../styles/navbar.css'

function Navbar() {
  const { currentUser, logout } = useAuth()
  const { totalUnread } = useNotification()
  const toggleSidebar = useUiStore(state => state.toggleSidebar)
  const navigate = useNavigate()

  const invitations    = useGroupInviteStore(state => state.invitations)
  const pendingInvites = invitations.length
  const [showNotifications, setShowNotifications] = useState(false)

  const avatarSrc = currentUser?.avatar || generateAvatar(currentUser?.name || 'U')

  // Desktop navbar is hidden via navbar.css (display:none).
  // This renders only on mobile as a slim top bar.
  return (
    <>
      <nav className='navbar'>
        <div className='navbar-left'>
          <button className='hamburger navbar-icon-btn' onClick={toggleSidebar} aria-label='Open menu'>
            <Menu size={22} />
          </button>
          <span className='navbar-logo'>WHEELTRIX</span>
        </div>

        <div className='navbar-right'>

          {/* Bell — opens NotificationPanel */}
          <button
            className='navbar-icon-btn navbar-bell-btn'
            title='Notifications'
            onClick={() => setShowNotifications(true)}
          >
            <Bell size={22} />
            {totalUnread > 0 && (
              <span className='navbar-badge'>{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </button>

          {/* Group invitations */}
          <button
            className='navbar-icon-btn navbar-badge-btn'
            title='Group Invitations'
            onClick={() => navigate('/group-invitations')}
          >
            <Users size={22} />
            {pendingInvites > 0 && (
              <span className='navbar-badge'>{pendingInvites > 9 ? '9+' : pendingInvites}</span>
            )}
          </button>

          {/* Settings */}
          <button
            className='navbar-icon-btn'
            title='Settings'
            onClick={() => navigate('/settings')}
          >
            <Settings size={22} />
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
          <button
            className='navbar-icon-btn navbar-logout-btn'
            title='Logout'
            onClick={logout}
          >
            <LogOut size={20} />
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