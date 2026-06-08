import { useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuth } from '../hooks/useAuth'
import { generateAvatar } from '../utils/generateAvatar'

function OnlineUsers() {
  const onlineUsers = useChatStore(state => state.onlineUsers)
  const rooms       = useChatStore(state => state.rooms)
  const { currentUser } = useAuth()

  // Build userId → { name, avatar } from all available sources in rooms
  const userMap = useMemo(() => {
    const map = {}

    // Add current user themselves
    if (currentUser) {
      const id = (currentUser._id || currentUser.id)?.toString()
      if (id) map[id] = { name: currentUser.name || 'Me', avatar: currentUser.avatar || null }
    }

    rooms.forEach(room => {
      // DM rooms: otherUser has name + avatar
      if (room.otherUser) {
        const id = (room.otherUser._id || room.otherUser.id)?.toString()
        if (id && !map[id]) {
          map[id] = { name: room.otherUser.name || 'User', avatar: room.otherUser.avatar || null }
        }
      }

      // Group rooms: participantIds may be objects with name/avatar
      ;(room.participantIds || []).forEach(p => {
        if (!p || typeof p !== 'object') return
        const id = (p._id || p.id)?.toString()
        if (id && !map[id]) {
          map[id] = { name: p.name || 'User', avatar: p.avatar || null }
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
          const info   = userMap[userId?.toString()] || {}
          const name   = info.name || 'User'
          const avatar = info.avatar || generateAvatar(name)
          return (
            <div key={userId} className="online-user-item" title={name}>
              <img
                src={avatar}
                alt={name}
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