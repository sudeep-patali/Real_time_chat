import { useEffect } from 'react'
import { useSocket } from './useSocket'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useGroupInviteStore } from '../store/groupInviteStore'
import * as groupService from '../services/groupService'
import * as roomService from '../services/roomService'
import {
  USER_ONLINE,
  RECEIVE_MESSAGE,
  MESSAGE_SENT,
  RECEIVE_REQUEST,
  REQUEST_ACCEPTED,
  REQUEST_REJECTED,
  NOTIFICATION_NEW,
  UNREAD_INCREMENT,
  GROUP_INVITATION,
  GROUP_INVITATION_ACCEPTED,
  GROUP_INVITATION_REJECTED,
  GROUP_MEMBER_REMOVED,
  GROUP_DELETED,
  USER_JOINED_GROUP,
  USER_PROFILE_UPDATED,
  PRIVACY_UPDATED,
} from '../socket/socketEvents'

export function useGlobalSocket() {
  const { on, off }       = useSocket()
  const currentUser       = useAuthStore(state => state.currentUser)
  const setUser           = useAuthStore(state => state.setUser)
  const updateSection     = useSettingsStore(state => state.updateSection)
  const updateUserOnline  = useChatStore(state => state.updateUserOnline)
  const updateUserProfile = useChatStore(state => state.updateUserProfile)
  const updateUserPrivacyInRooms = useChatStore(state => state.updateUserPrivacyInRooms)
  const updateLastMessage = useChatStore(state => state.updateLastMessage)
  const addPendingRoom    = useChatStore(state => state.addPendingRoom)
  const moveToAccepted    = useChatStore(state => state.moveToAccepted)
  const removePendingRoom = useChatStore(state => state.removePendingRoom)
  const removeRoom        = useChatStore(state => state.removeRoom)
  const addRoom           = useChatStore(state => state.addRoom)
  const addNotification   = useNotificationStore(state => state.addNotification)
  const incrementUnread   = useNotificationStore(state => state.incrementUnread)
  const activeRoomId      = useChatStore(state => state.activeRoomId)
  const addInvitation     = useGroupInviteStore(state => state.addInvitation)
  const removeInvitation  = useGroupInviteStore(state => state.removeInvitation)

  useEffect(() => {
    // ── Online status ─────────────────────────────────────────────────────
    const handleUserOnline = ({ userId, isOnline }) => {
      if (!userId) return
      updateUserOnline(userId.toString(), isOnline)
    }

    // ── Incoming messages (sidebar preview) ───────────────────────────────
    const handleReceiveMessage = ({ message }) => {
      if (!message) return
      const roomId   = message.roomId?.toString()
      const senderId = (message.senderId?.toString() || message.sender?._id?.toString())
      if (!roomId) return

      // Update sidebar preview
      updateLastMessage(roomId, {
        content:   message.content,
        timestamp: message.timestamp || message.createdAt,
        type:      message.type     || 'text',
        fileName:  message.fileName || null,
      })

      // If room not in store yet, reload rooms
      const storeState = useChatStore.getState()
      const allRooms   = [...storeState.rooms, ...storeState.pendingRooms]
      const known      = allRooms.some(r => (r.id || r._id)?.toString() === roomId)
      if (!known) {
        const uid = currentUser?.id?.toString()
        roomService.getRooms()
          .then(res => useChatStore.getState().setRooms((res.data.rooms || []).map(r => normalizeRoomBasic(r, uid))))
          .catch(() => {})
        roomService.getRequests()
          .then(res => useChatStore.getState().setPendingRooms((res.data.requests || []).map(r => normalizeRoomBasic(r, uid))))
          .catch(() => {})
      }

      // Unread badge: increment only if not in active room, and not own message
      if (senderId !== currentUser?.id?.toString()) {
        const activeStr = storeState.activeRoomId?.toString()
        if (!activeStr || roomId !== activeStr) {
          incrementUnread(roomId)
        }
      }
    }

    // ── Sender sidebar preview ─────────────────────────────────────────────
    const handleMessageSent = ({ message }) => {
      if (!message) return
      const roomId = message.roomId?.toString()
      if (!roomId) return
      updateLastMessage(roomId, {
        content:   message.content,
        timestamp: message.timestamp || message.createdAt,
        type:      message.type     || 'text',
        fileName:  message.fileName || null,
      })
    }

    // ── UNREAD_INCREMENT (server-driven fallback) ──────────────────────────
    const handleUnreadIncrement = ({ roomId }) => {
      if (!roomId) return
      if (roomId !== activeRoomId?.toString()) {
        incrementUnread(roomId)
      }
    }

    // ── DM message requests ────────────────────────────────────────────────
    const handleReceiveRequest = ({ roomId, senderId, senderName, isGroup, groupName, receiverId }) => {
      if (receiverId && receiverId?.toString() !== currentUser?.id?.toString()) return
      addPendingRoom({
        id:             roomId,
        participantIds: [{ id: senderId?.toString(), _id: senderId?.toString(), name: senderName }],
        isGroup:        !!isGroup,
        groupName:      groupName || null,
        status:         isGroup ? 'accepted' : 'pending',
        otherUser:      isGroup ? null : { id: senderId?.toString(), name: senderName },
        lastMessage:    null
      })
      addNotification({
        id:        `req-${Date.now()}`,
        type:      'request',
        title:     senderName,
        body:      'Sent you a message request',
        timestamp: new Date().toISOString(),
        isRead:    false, read: false, avatar: null
      })
    }

    const handleRequestAccepted = ({ roomId }) => moveToAccepted(roomId)
    const handleRequestRejected = ({ roomId }) => removePendingRoom(roomId)

    const handleNotificationNew = ({ notification, receiverId }) => {
      if (receiverId?.toString() === currentUser?.id?.toString()) {
        addNotification(notification)
      }
    }

    // ── Group invitation received ──────────────────────────────────────────
    const handleGroupInvitation = ({ receiverId, invitationId, group, invitedBy, memberCount }) => {
      if (receiverId?.toString() !== currentUser?.id?.toString()) return
      addInvitation({
        id: invitationId,
        group: { ...group, memberCount: memberCount || 0 },
        invitedBy,
        createdAt: new Date().toISOString()
      })
      addNotification({
        id:        `grp-inv-${invitationId}`,
        type:      'request',
        title:     invitedBy?.name || 'Someone',
        body:      `invited you to join ${group?.name}`,
        timestamp: new Date().toISOString(),
        isRead:    false, read: false, avatar: invitedBy?.avatar || null
      })
    }

    const handleGroupInvitationAccepted = ({ receiverId, groupName, acceptedBy }) => {
      if (receiverId?.toString() !== currentUser?.id?.toString()) return
      addNotification({
        id:        `grp-acc-${Date.now()}`,
        type:      'group',
        title:     groupName || 'Group',
        body:      `${acceptedBy?.name} joined the group`,
        timestamp: new Date().toISOString(),
        isRead:    false, read: false, avatar: null
      })
    }

    const handleGroupInvitationRejected = ({ invitationId, receiverId }) => {
      if (receiverId?.toString() !== currentUser?.id?.toString()) return
      removeInvitation(invitationId)
    }

    const handleUserJoinedGroup = async ({ userId, groupId }) => {
      if (userId?.toString() !== currentUser?.id?.toString()) return
      try {
        const res  = await groupService.getGroupById(groupId)
        const room = res.data.room || res.data
        if (!room) return
        addRoom({
          ...room,
          id:             room._id || room.id,
          isGroup:        true,
          groupName:      room.groupName,
          participantIds: (room.participantIds || []).map(p =>
            typeof p === 'object' ? { ...p, id: p._id || p.id } : p
          ),
          lastMessage: room.lastMessage
            ? { content: room.lastMessage.content || '', timestamp: room.lastMessage.createdAt || room.lastMessage.timestamp, senderName: room.lastMessage.senderId?.name || '' }
            : null
        })
      } catch {}
    }

    const handleGroupMemberRemoved = ({ groupId, removedUserId }) => {
      if (removedUserId?.toString() !== currentUser?.id?.toString()) return
      removeRoom(groupId)
    }

    const handleGroupDeleted = ({ groupId }) => { removeRoom(groupId) }

    const handleUserProfileUpdated = ({ userId, name, avatar, username, statusValue, customStatus, isOnline, lastSeen, canMessage, canAddToGroup }) => {
      // Apply full profile update including privacy-filtered fields
      updateUserProfile(userId, { name, avatar, username, statusValue, customStatus })
      // Also update privacy-filtered fields in room participants
      if (isOnline !== undefined || lastSeen !== undefined || canMessage !== undefined || canAddToGroup !== undefined) {
        updateUserPrivacyInRooms(userId, {
          ...(isOnline    !== undefined ? { isOnline }    : {}),
          ...(lastSeen    !== undefined ? { lastSeen }    : {}),
          ...(avatar      !== undefined ? { avatar }      : {}),
          ...(canMessage  !== undefined ? { canMessage }  : {}),
          ...(canAddToGroup !== undefined ? { canAddToGroup } : {}),
        })
      }
    }

    // When a user changes their privacy settings, re-fetch their filtered profile
    // so sidebar, chat headers, find-people all reflect the new rules instantly.
    const handlePrivacyUpdated = ({ userId, privacy }) => {
      if (!userId) return

      // If it's our own privacy update, sync the settings store and authStore
      // so the UI reflects the new toggles immediately without a page refresh.
      const myId = currentUser?.id?.toString() || currentUser?._id?.toString()
      if (userId === myId && privacy) {
        // Update settingsStore.settings.privacy so the toggles in PrivacySection stay in sync
        updateSection('privacy', {
          readReceipts:    privacy.readReceipts    ?? true,
          typingIndicator: privacy.typingIndicator ?? true,
          lastSeen:        privacy.lastSeen        ?? 'everyone',
          onlineStatus:    privacy.onlineStatus    ?? 'everyone',
          addToGroups:     privacy.addToGroups     ?? 'everyone',
        })
        // Also update currentUser.privacy so hooks that read from authStore are correct
        if (currentUser) {
          setUser({ ...currentUser, privacy: { ...(currentUser.privacy || {}), ...privacy } })
        }
      }

      // For other users: re-apply cached profile with potentially new visibility rules.
      // The server also emits a privacy-aware user_profile_updated, so the
      // updateUserPrivacyInRooms call below ensures the sidebar / chat header
      // clears or restores online status / lastSeen in real time.
      if (userId !== myId && privacy) {
        updateUserPrivacyInRooms(userId, {
          // If the other user hid their online status from us, clear it
          ...(privacy.onlineStatus === 'nobody' ? { isOnline: null } : {}),
          ...(privacy.lastSeen     === 'nobody' ? { lastSeen: null } : {}),
        })
      }
    }

    on(USER_ONLINE,                handleUserOnline)
    on(RECEIVE_MESSAGE,            handleReceiveMessage)
    on(MESSAGE_SENT,               handleMessageSent)
    on(UNREAD_INCREMENT,           handleUnreadIncrement)
    on(RECEIVE_REQUEST,            handleReceiveRequest)
    on(REQUEST_ACCEPTED,           handleRequestAccepted)
    on(REQUEST_REJECTED,           handleRequestRejected)
    on(NOTIFICATION_NEW,           handleNotificationNew)
    on(GROUP_INVITATION,           handleGroupInvitation)
    on(GROUP_INVITATION_ACCEPTED,  handleGroupInvitationAccepted)
    on(GROUP_INVITATION_REJECTED,  handleGroupInvitationRejected)
    on(USER_JOINED_GROUP,          handleUserJoinedGroup)
    on(GROUP_MEMBER_REMOVED,       handleGroupMemberRemoved)
    on(USER_PROFILE_UPDATED,       handleUserProfileUpdated)
    on(PRIVACY_UPDATED,            handlePrivacyUpdated)
    on(GROUP_DELETED,              handleGroupDeleted)

    return () => {
      off(USER_ONLINE,               handleUserOnline)
      off(RECEIVE_MESSAGE,           handleReceiveMessage)
      off(MESSAGE_SENT,              handleMessageSent)
      off(UNREAD_INCREMENT,          handleUnreadIncrement)
      off(RECEIVE_REQUEST,           handleReceiveRequest)
      off(REQUEST_ACCEPTED,          handleRequestAccepted)
      off(REQUEST_REJECTED,          handleRequestRejected)
      off(NOTIFICATION_NEW,          handleNotificationNew)
      off(GROUP_INVITATION,          handleGroupInvitation)
      off(GROUP_INVITATION_ACCEPTED, handleGroupInvitationAccepted)
      off(GROUP_INVITATION_REJECTED, handleGroupInvitationRejected)
      off(USER_JOINED_GROUP,         handleUserJoinedGroup)
      off(GROUP_MEMBER_REMOVED,      handleGroupMemberRemoved)
      off(USER_PROFILE_UPDATED,      handleUserProfileUpdated)
      off(PRIVACY_UPDATED,           handlePrivacyUpdated)
      off(GROUP_DELETED,             handleGroupDeleted)
    }
  }, [currentUser, activeRoomId, setUser, updateSection])
}

function normalizeRoomBasic(room, currentUserId) {
  const participants = (room.participantIds || []).map(p =>
    typeof p === 'object'
      ? { ...p, id: (p._id || p.id)?.toString(), _id: (p._id || p.id)?.toString() }
      : { id: p?.toString(), _id: p?.toString() }
  )
  let otherUser = room.otherUser || null
  if (!room.isGroup && currentUserId && !otherUser?.name) {
    const other = participants.find(p => p.id && p.id !== currentUserId)
    if (other?.name) {
      otherUser = { id: other.id, _id: other._id, name: other.name, avatar: other.avatar || null }
    }
  }
  return {
    ...room,
    id:             (room.id || room._id)?.toString(),
    _id:            (room.id || room._id)?.toString(),
    participantIds: participants,
    otherUser,
    requestedBy:    room.requestedBy
      ? (room.requestedBy?._id || room.requestedBy?.id || room.requestedBy)?.toString()
      : null,
    lastMessage: room.lastMessage
      ? {
          content:    room.lastMessage.content   || '',
          timestamp:  room.lastMessage.createdAt || room.lastMessage.timestamp,
          senderName: room.lastMessage.senderId?.name || '',
          type:       room.lastMessage.type      || 'text',
          fileName:   room.lastMessage.fileName  || null,
        }
      : null,
  }
}