import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useSocket } from './useSocket'
import * as messageService from '../services/messageService'
import {
  RECEIVE_MESSAGE,
  MESSAGE_SENT,
  USER_TYPING,
  USER_STOP_TYPING,
  USER_ONLINE,
  JOIN_ROOM,
  SEND_MESSAGE,
  MESSAGE_READ,
  MESSAGE_DELIVERED,
  RECEIVE_REQUEST,
  REQUEST_ACCEPTED,
  REQUEST_REJECTED,
  NOTIFICATION_NEW,
  MESSAGE_BLOCKED,
  MESSAGE_EDIT,
  MESSAGE_EDITED,
  MESSAGE_DELETE,
  MESSAGE_DELETED,
  // Phase 12.1 typing events
  TYPING_START,
  TYPING_STOP,
  GROUP_TYPING_START,
  GROUP_TYPING_STOP,
} from '../socket/socketEvents'
import { useAuthStore } from '../store/authStore'

// FIX Issue 2: Always convert senderId to a plain string so the
// isOwn === (msg.senderId === currentUserId) comparison works
// regardless of whether senderId arrives as a Mongo ObjectId,
// a populated object, or a plain string.
function normalizeMessage(msg) {
  // Resolve the raw senderId value from any shape the server can return
  const rawSenderId =
    msg.senderId?._id   ||   // populated object from DB fetch
    msg.senderId?.id    ||   // already normalised object
    msg.senderId            // plain string / ObjectId

  return {
    id:           (msg.id || msg._id)?.toString(),
    content:      msg.content,
    // Always store as a plain string so === comparisons work
    senderId:     rawSenderId?.toString?.() ?? String(rawSenderId ?? ''),
    senderName:   msg.senderId?.name || msg.senderName || 'User',
    senderAvatar: msg.senderId?.avatar || msg.senderAvatar || null,
    roomId:       (msg.roomId?._id || msg.roomId?.id || msg.roomId)?.toString?.() ?? String(msg.roomId ?? ''),
    timestamp:    msg.createdAt || msg.timestamp,
    type:         msg.type || 'text',
    fileUrl:      msg.fileUrl || null,
    fileName:     msg.fileName || null,
    mimeType:     msg.mimeType || null,
    fileDuration: msg.fileDuration || null,
    readBy:       msg.readBy || []
  }
}

export function useChat(roomId) {
  const messages          = useChatStore(state => state.messages)
  const rooms             = useChatStore(state => state.rooms)
  const activeRoomId      = useChatStore(state => state.activeRoomId)
  const typingUsers       = useChatStore(state => state.typingUsers)
  const setMessages       = useChatStore(state => state.setMessages)
  const addMessage        = useChatStore(state => state.addMessage)
  const replaceMessage      = useChatStore(state => state.replaceMessage)
  const removeMessage       = useChatStore(state => state.removeMessage)
  const editMessageInStore  = useChatStore(state => state.editMessageInStore)
  const setActiveRoom     = useChatStore(state => state.setActiveRoom)
  const setTyping         = useChatStore(state => state.setTyping)
  const setTypingUser     = useChatStore(state => state.setTypingUser)
  const updateUserOnline  = useChatStore(state => state.updateUserOnline)
  const updateLastMessage = useChatStore(state => state.updateLastMessage)
  const addPendingRoom    = useChatStore(state => state.addPendingRoom)
  const moveToAccepted    = useChatStore(state => state.moveToAccepted)
  const removePendingRoom = useChatStore(state => state.removePendingRoom)
  const clearUnread       = useNotificationStore(state => state.clearUnread)
  const addNotification   = useNotificationStore(state => state.addNotification)
  const currentUser       = useAuthStore(state => state.currentUser)
  const { emit, on, off } = useSocket()

  // Auto-disappear timers: userId -> timeoutId
  const typingTimers = useRef({})

  const clearTypingTimer = (userId) => {
    if (typingTimers.current[userId]) {
      clearTimeout(typingTimers.current[userId])
      delete typingTimers.current[userId]
    }
  }

  const startTypingAutoExpire = (userId, userName) => {
    clearTypingTimer(userId)
    if (setTypingUser) {
      setTypingUser(userId, userName, true)
    } else {
      setTyping(userId, true)
    }
    typingTimers.current[userId] = setTimeout(() => {
      if (setTypingUser) {
        setTypingUser(userId, userName, false)
      } else {
        setTyping(userId, false)
      }
      delete typingTimers.current[userId]
    }, 4000)
  }

  const stopTyping = (userId) => {
    clearTypingTimer(userId)
    if (setTypingUser) {
      setTypingUser(userId, null, false)
    } else {
      setTyping(userId, false)
    }
  }

  useEffect(() => {
    if (!roomId) return

    setActiveRoom(roomId)

    // Immediately clear the badge in the UI
    clearUnread(roomId)

    // Mark all messages read on the server, then emit the socket event so
    // the other participant(s) see read-receipt ticks update in real time.
    messageService.markRead(roomId)
      .then(() => {
        emit(MESSAGE_READ, { roomId })
      })
      .catch(() => {})

    messageService.fetchHistory(roomId)
      .then(res => {
        const normalized = (res.data.messages || []).map(normalizeMessage)
        setMessages(normalized)
      })
      .catch(() => setMessages([]))

    emit(JOIN_ROOM, { roomId })

    // ── Incoming messages that belong to THIS open room ────────────────────
    const handleReceiveMessage = (payload) => {
      const msg = normalizeMessage(payload.message)
      // FIX Issue 2: currentUser.id is always a string (from authStore),
      // and now msg.senderId is also always a string — comparison is safe.
      if (msg.senderId === currentUser?.id?.toString()) return

      if (msg.roomId === roomId?.toString()) {
        addMessage(msg)
        updateLastMessage(msg.roomId, msg)
        messageService.markRead(roomId).catch(() => {})
        emit(MESSAGE_READ, { roomId })
      }
    }

    // ── Sent message acknowledgement ──────────────────────────────────────
    const handleMessageSent = (payload) => {
      const msg    = normalizeMessage(payload.message)
      const tempId = payload.tempId
      if (msg.roomId === roomId?.toString()) {
        if (tempId) replaceMessage(tempId, msg)
      }
      updateLastMessage(msg.roomId, msg)
    }

    // ── Phase 12.1: Individual chat typing ──
    const handleTypingStart = ({ userId, userName }) => {
      startTypingAutoExpire(userId, userName || userId)
    }
    const handleTypingStop = ({ userId }) => {
      stopTyping(userId)
    }

    // ── Phase 12.1: Group chat typing ──
    const handleGroupTypingStart = ({ userId, userName }) => {
      startTypingAutoExpire(userId, userName || userId)
    }
    const handleGroupTypingStop = ({ userId }) => {
      stopTyping(userId)
    }

    // Legacy typing fallback
    const handleUserTyping    = ({ userId, isTyping }) => setTyping(userId, isTyping)
    const handleUserOnline    = ({ userId, isOnline }) => updateUserOnline(userId, isOnline)
    const handleMessageRead   = () => {}
    const handleMessageDelivered = () => {}

    const handleReceiveRequest = ({ roomId: reqRoomId, senderId, senderName }) => {
      addPendingRoom({
        id:             reqRoomId,
        participantIds: [senderId],
        isGroup:        false,
        status:         'pending',
        otherUser:      { id: senderId?.toString(), name: senderName },
        lastMessage:    null
      })
    }

    const handleRequestAccepted = ({ roomId: rId }) => moveToAccepted(rId)
    const handleRequestRejected = ({ roomId: rId }) => removePendingRoom(rId)

    const handleMessageBlocked = ({ tempId }) => {
      if (tempId) removeMessage(tempId)
    }

    const handleMessageEdited = ({ messageId, content, editedAt }) => {
      editMessageInStore(messageId, { content, isEdited: true, editedAt })
    }

    const handleMessageDeleted = ({ messageId, deleteFor }) => {
      if (deleteFor === 'all') {
        editMessageInStore(messageId, { isDeleted: true, content: '' })
      } else {
        removeMessage(messageId)
      }
    }

    const handleNotificationNew = ({ notification, receiverId }) => {
      if (receiverId?.toString() === currentUser?.id?.toString()) {
        addNotification(notification)
      }
    }

    on(RECEIVE_MESSAGE,    handleReceiveMessage)
    on(MESSAGE_SENT,       handleMessageSent)
    on(TYPING_START,       handleTypingStart)
    on(TYPING_STOP,        handleTypingStop)
    on(GROUP_TYPING_START, handleGroupTypingStart)
    on(GROUP_TYPING_STOP,  handleGroupTypingStop)
    on(USER_TYPING,        handleUserTyping)
    on(USER_STOP_TYPING,   ({ userId }) => setTyping(userId, false))
    on(USER_ONLINE,        handleUserOnline)
    on(MESSAGE_READ,       handleMessageRead)
    on(MESSAGE_DELIVERED,  handleMessageDelivered)
    on(RECEIVE_REQUEST,    handleReceiveRequest)
    on(REQUEST_ACCEPTED,   handleRequestAccepted)
    on(REQUEST_REJECTED,   handleRequestRejected)
    on(NOTIFICATION_NEW,   handleNotificationNew)
    on(MESSAGE_BLOCKED,    handleMessageBlocked)
    on(MESSAGE_EDITED,     handleMessageEdited)
    on(MESSAGE_DELETED,    handleMessageDeleted)

    return () => {
      Object.keys(typingTimers.current).forEach(clearTypingTimer)

      off(RECEIVE_MESSAGE,    handleReceiveMessage)
      off(MESSAGE_SENT,       handleMessageSent)
      off(TYPING_START,       handleTypingStart)
      off(TYPING_STOP,        handleTypingStop)
      off(GROUP_TYPING_START, handleGroupTypingStart)
      off(GROUP_TYPING_STOP,  handleGroupTypingStop)
      off(USER_TYPING,        handleUserTyping)
      off(USER_ONLINE,        handleUserOnline)
      off(MESSAGE_READ,       handleMessageRead)
      off(MESSAGE_DELIVERED,  handleMessageDelivered)
      off(RECEIVE_REQUEST,    handleReceiveRequest)
      off(REQUEST_ACCEPTED,   handleRequestAccepted)
      off(REQUEST_REJECTED,   handleRequestRejected)
      off(NOTIFICATION_NEW,   handleNotificationNew)
      off(MESSAGE_BLOCKED,    handleMessageBlocked)
      off(MESSAGE_EDITED,     handleMessageEdited)
      off(MESSAGE_DELETED,    handleMessageDeleted)
      setMessages([])
    }
  }, [roomId])

  const sendMessage = async (content, type = 'text', fileUrl = null, fileName = null, mimeType = null, fileDuration = null) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimistic = {
      id:        tempId,
      content,
      // FIX Issue 2: always use a string so the isOwn check is reliable
      senderId:  currentUser?.id?.toString(),
      senderName: currentUser?.name || 'You',
      roomId,
      timestamp: new Date().toISOString(),
      type,
      fileUrl,
      fileName,
      mimeType,
      fileDuration,
    }
    addMessage(optimistic)
    emit(SEND_MESSAGE, { content, roomId, type, fileUrl, fileName, mimeType, fileDuration, tempId })
  }

  const editMessage = (messageId, content) => {
    editMessageInStore(messageId, { content, isEdited: true, editedAt: new Date().toISOString() })
    emit(MESSAGE_EDIT, { messageId, content, roomId })
  }

  const deleteMessage = (messageId, deleteFor = 'me') => {
    if (deleteFor === 'all') {
      editMessageInStore(messageId, { isDeleted: true, content: '' })
    } else {
      removeMessage(messageId)
    }
    emit(MESSAGE_DELETE, { messageId, roomId, deleteFor })
  }

  return { messages, rooms, activeRoomId, typingUsers, sendMessage, editMessage, deleteMessage }
}