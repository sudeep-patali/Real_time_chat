import { useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { generateAvatar } from '../utils/generateAvatar'

function OnlineUsers() {
  const onlineUsers = useChatStore(state => state.onlineUsers)
  const rooms       = useChatStore(state => state.rooms)
  const currentUser = useAuthStore(state => state.currentUser)

  // Build every known user's info from all available sources
  const userMap = useMemo(() => {
    const map = {}

    // 1. Current logged-in user
    if (currentUser) {
      const id = (currentUser._id || currentUser.id)?.toString()
      if (id) map[id] = { name: currentUser.name || 'Me', avatar: currentUser.avatar || null }
    }

    rooms.forEach(room => {
      // 2. DM rooms — otherUser is the most reliable source
      if (!room.isGroup && room.otherUser) {
        const u  = room.otherUser
        const id = (u._id || u.id)?.toString()
        if (id && u.name && !map[id]) {
          map[id] = { name: u.name, avatar: u.avatar || null }
        }
      }

      // 3. Group rooms — participantIds are populated objects
      ;(room.participantIds || []).forEach(p => {
        if (!p || typeof p !== 'object') return
        const id   = (p._id || p.id)?.toString()
        const name = p.name
        if (id && name && !map[id]) {
          map[id] = { name, avatar: p.avatar || null }
        }
      })
    })

    return map
  }, [rooms, currentUser])

  if (onlineUsers.length === 0) return null

  return (
    <div className="online-users-wrap">
      <p className="online-users-label">Online</p>
      <div className="online-users-list">
        {onlineUsers.map(userId => {
          const uid    = userId?.toString()
          const info   = userMap[uid]
          const name   = info?.name || null
          const avatar = info?.avatar || (name ? generateAvatar(name) : null)

          // Skip entirely if we have no idea who this user is
          if (!name && !avatar) return null

          return (
            <div key={uid} className="online-user-item" title={name || ''}>
              <img
                src={avatar}
                alt={name || 'User'}
                className="online-user-avatar"
              />
              <span className="online-user-dot" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OnlineUsers