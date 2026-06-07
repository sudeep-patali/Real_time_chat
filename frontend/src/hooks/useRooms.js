import { useEffect, useCallback } from 'react'
import { useChatStore }           from '../store/chatStore'
import { useNotificationStore }   from '../store/notificationStore'
import { useAuthStore }           from '../store/authStore'
import * as roomService           from '../services/roomService'
import * as messageService        from '../services/messageService'

export function useRooms() {
  const setRooms         = useChatStore(state => state.setRooms)
  const setPendingRooms  = useChatStore(state => state.setPendingRooms)
  const rooms            = useChatStore(state => state.rooms)
  const pendingRooms     = useChatStore(state => state.pendingRooms)
  const setUnreadCounts  = useNotificationStore(state => state.setUnreadCounts)
  const currentUser      = useAuthStore(state => state.currentUser)

  const fetchRooms = useCallback(async () => {
    try {
      const [acceptedRes, pendingRes, unreadRes] = await Promise.all([
        roomService.getRooms(),
        roomService.getRequests(),
        messageService.getAllUnreadCounts().catch(() => ({ data: { unreadCounts: {} } }))
      ])

      // FIX: always use a plain string for ID comparison
      const currentUserId = currentUser?.id?.toString() || currentUser?._id?.toString()

      const accepted = (acceptedRes.data.rooms   || []).map(r => normalizeRoom(r, currentUserId))
      const pending  = (pendingRes.data.requests || []).map(r => normalizeRoom(r, currentUserId))

      // FIX Issue 4: Use the store's merge-aware setRooms (not a raw replace)
      // so optimistically-added rooms with otherUser are preserved.
      setRooms(accepted)
      setPendingRooms(pending)

      const counts = unreadRes.data.unreadCounts || {}
      setUnreadCounts(counts)
    } catch (err) {
      console.error('loadRooms error:', err)
    }
  }, [setRooms, setPendingRooms, setUnreadCounts, currentUser])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    const handleFocus = () => fetchRooms()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchRooms])

  return { rooms, pendingRooms, refetchRooms: fetchRooms }
}

// FIX Issue 1 & 2: Normalize MongoDB _id → id AND always derive otherUser
// from participantIds so the chat header can display the name immediately,
// regardless of whether the server returned populated objects or raw IDs.
function normalizeRoom(room, currentUserId) {
  const normalizedParticipants = (room.participantIds || []).map(p =>
    typeof p === 'object'
      ? {
          ...p,
          // FIX: prefer _id (Mongoose default), fall back to id
          id:  (p._id || p.id)?.toString(),
          _id: (p._id || p.id)?.toString(),
        }
      : { id: p?.toString(), _id: p?.toString() }
  )

  // Derive otherUser for DMs — always compute it so the chat header
  // has a name even if the server didn't include an otherUser field.
  let otherUser = null
  if (!room.isGroup && currentUserId) {
    // Try the populated otherUser the server may have sent first
    if (room.otherUser?.name) {
      otherUser = {
        ...room.otherUser,
        id:  (room.otherUser._id || room.otherUser.id)?.toString(),
        _id: (room.otherUser._id || room.otherUser.id)?.toString(),
      }
    } else {
      // Derive from participantIds (server must have populated them)
      const other = normalizedParticipants.find(p => p.id && p.id !== currentUserId)
      if (other) {
        otherUser = {
          id:     other.id,
          _id:    other._id,
          name:   other.name   || null,
          avatar: other.avatar || null,
          email:  other.email  || null,
          isOnline: other.isOnline ?? false,
        }
      }
    }
  }

  // Normalize requestedBy to a plain string so the isPending guard in
  // Chat.jsx can safely compare it with currentUser.id (string vs string).
  const requestedByStr = room.requestedBy
    ? (room.requestedBy?._id || room.requestedBy?.id || room.requestedBy)?.toString()
    : null

  return {
    ...room,
    id:             (room.id || room._id)?.toString(),
    _id:            (room.id || room._id)?.toString(),
    participantIds: normalizedParticipants,
    otherUser,
    requestedBy:    requestedByStr,
    lastMessage: room.lastMessage
      ? {
          ...room.lastMessage,
          content:    room.lastMessage.content   || '',
          timestamp:  room.lastMessage.createdAt || room.lastMessage.timestamp,
          senderName: room.lastMessage.senderId?.name || '',
          // Preserve type and fileName so Sidebar shows friendly previews
          type:       room.lastMessage.type     || 'text',
          fileName:   room.lastMessage.fileName || null,
        }
      : null
  }
}