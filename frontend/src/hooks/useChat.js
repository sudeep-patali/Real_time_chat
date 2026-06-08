import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore }        from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useSocket }           from './useSocket'
import * as messageService     from '../services/messageService'
import {
  RECEIVE_MESSAGE, MESSAGE_SENT, USER_TYPING, USER_STOP_TYPING, USER_ONLINE,
  JOIN_ROOM, SEND_MESSAGE, MESSAGE_READ, MESSAGE_DELIVERED,
  RECEIVE_REQUEST, REQUEST_ACCEPTED, REQUEST_REJECTED, NOTIFICATION_NEW,
  MESSAGE_BLOCKED, MESSAGE_EDIT, MESSAGE_EDITED, MESSAGE_DELETE, MESSAGE_DELETED,
  TYPING_START, TYPING_STOP, GROUP_TYPING_START, GROUP_TYPING_STOP,
  MSG_DELIVERED, MSG_READ, GROUP_MSG_DELIVERED, GROUP_MSG_READ,
  GROUP_MESSAGE_READ, MESSAGE_INFO_REQ, MESSAGE_INFO_RES,
} from '../socket/socketEvents'
import { useAuthStore }   from '../store/authStore'
import { encryptMessage, decryptMessage, decryptRoomKey } from '../crypto/keyManager'

// ── Normalize raw server/socket message to a flat shape ──────────────────────
function normalizeMessage(msg) {
  const rawSenderId =
    msg.senderId?._id  ||
    msg.senderId?.id   ||
    msg.senderId

  return {
    id:             (msg.id || msg._id)?.toString(),
    content:        msg.content,
    senderId:       rawSenderId?.toString?.() ?? String(rawSenderId ?? ''),
    senderName:     msg.senderId?.name  || msg.senderName  || 'User',
    senderAvatar:   msg.senderId?.avatar || msg.senderAvatar || null,
    roomId:         (msg.roomId?._id || msg.roomId?.id || msg.roomId)?.toString?.() ?? String(msg.roomId ?? ''),
    timestamp:      msg.createdAt   || msg.timestamp,
    sentAt:         msg.sentAt      || msg.createdAt || msg.timestamp,
    deliveredAt:    msg.deliveredAt || null,
    readAt:         msg.readAt      || null,
    deliveredTo:    msg.deliveredTo || [],
    readBy:         msg.readBy      || [],
    memberStatuses: msg.memberStatuses || [],
    status:         msg.status || 'sent',
    type:           msg.type   || 'text',
    fileUrl:        msg.fileUrl      || null,
    fileName:       msg.fileName     || null,
    mimeType:       msg.mimeType     || null,
    fileDuration:   msg.fileDuration || null,
    isEdited:       msg.isEdited     || false,
    editedAt:       msg.editedAt     || null,
    isDeleted:      msg.isDeleted    || false,
    deletedFor:     msg.deletedFor   || [],
    replyTo:        msg.replyTo      || null,
    // E2E encryption fields (pass through so ChatBox can show lock icon)
    encrypted:      msg.encrypted    || false,
    iv:             msg.iv           || null,
    authTag:        msg.authTag      || null,
    decryptFailed:  false,
  }
}

// ── Room key cache: roomId → CryptoKey ───────────────────────────────────────
const roomKeyCache = new Map()

async function getRoomKey(roomId, userId) {
  if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId)
  try {
    const res      = await messageService.fetchRoomKey(roomId)   // GET /api/rooms/:id/key
    const cryptoKey = await decryptRoomKey(res.data.encryptedKey, userId)
    roomKeyCache.set(roomId, cryptoKey)
    return cryptoKey
  } catch {
    return null
  }
}

// ── Decrypt a message in-place; marks decryptFailed on error ─────────────────
async function tryDecrypt(msg, roomId, userId) {
  if (!msg.encrypted || !msg.iv || !msg.authTag) return msg
  try {
    const roomKey     = await getRoomKey(roomId, userId)
    if (!roomKey) throw new Error('No room key')
    const plaintext   = await decryptMessage(msg, roomKey)
    return { ...msg, content: plaintext }
  } catch {
    return { ...msg, content: '', decryptFailed: true }
  }
}

export function useChat(roomId) {
  const messages           = useChatStore(state => state.messages)
  const rooms              = useChatStore(state => state.rooms)
  const activeRoomId       = useChatStore(state => state.activeRoomId)
  const typingUsers        = useChatStore(state => state.typingUsers)
  const setMessages        = useChatStore(state => state.setMessages)
  const addMessage         = useChatStore(state => state.addMessage)
  const replaceMessage     = useChatStore(state => state.replaceMessage)
  const removeMessage      = useChatStore(state => state.removeMessage)
  const editMessageInStore = useChatStore(state => state.editMessageInStore)
  const setActiveRoom      = useChatStore(state => state.setActiveRoom)
  const setTyping          = useChatStore(state => state.setTyping)
  const setTypingUser      = useChatStore(state => state.setTypingUser)
  const updateUserOnline   = useChatStore(state => state.updateUserOnline)
  const updateLastMessage  = useChatStore(state => state.updateLastMessage)
  const addPendingRoom     = useChatStore(state => state.addPendingRoom)
  const moveToAccepted     = useChatStore(state => state.moveToAccepted)
  const removePendingRoom  = useChatStore(state => state.removePendingRoom)
  const clearUnread        = useNotificationStore(state => state.clearUnread)
  const addNotification    = useNotificationStore(state => state.addNotification)
  const currentUser        = useAuthStore(state => state.currentUser)
  const { emit, on, off }  = useSocket()

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
    clearUnread(roomId)

    const room    = rooms.find(r => (r.id || r._id) === roomId)
    const isGroup = room?.isGroup || false

    messageService.markRead(roomId)
      .then(() => {
        if (isGroup) {
          emit(GROUP_MESSAGE_READ, { roomId })
        } else {
          emit(MESSAGE_READ, { roomId })
        }
      })
      .catch(() => {})

    messageService.fetchHistory(roomId)
      .then(async (res) => {
        const rawMsgs    = (res.data.messages || []).map(normalizeMessage)
        const userId     = currentUser?.id?.toString()
        const decrypted  = await Promise.all(rawMsgs.map(m => tryDecrypt(m, roomId, userId)))
        setMessages(decrypted)
      })
      .catch(() => setMessages([]))

    emit(JOIN_ROOM, { roomId })

    // ── Incoming messages ──────────────────────────────────────────────────
    const handleReceiveMessage = async (payload) => {
      let msg = normalizeMessage(payload.message)
      if (msg.senderId === currentUser?.id?.toString()) return

      if (msg.roomId === roomId?.toString()) {
        msg = await tryDecrypt(msg, roomId, currentUser?.id?.toString())
        addMessage(msg)
        updateLastMessage(msg.roomId, msg)
        messageService.markRead(roomId).catch(() => {})
        if (isGroup) {
          emit(GROUP_MESSAGE_READ, { roomId })
        } else {
          emit(MESSAGE_READ, { roomId })
        }
      }
    }

    const handleMessageSent = async (payload) => {
      let msg    = normalizeMessage(payload.message)
      const tempId = payload.tempId
      if (msg.roomId === roomId?.toString()) {
        msg = await tryDecrypt(msg, roomId, currentUser?.id?.toString())
        if (tempId) replaceMessage(tempId, msg)
      }
      updateLastMessage(msg.roomId, msg)
    }

    const handleMsgDelivered      = ({ messageId, deliveredAt, status }) => {
      editMessageInStore(messageId, { deliveredAt, status: status || 'delivered' })
    }
    const handleMsgRead           = ({ messageId, readAt, status }) => {
      editMessageInStore(messageId, { readAt, status: status || 'read' })
    }
    const handleGroupMsgDelivered = ({ messageId, userId, deliveredAt, status }) => {
      editMessageInStore(messageId, (msg) => {
        const deliveredTo    = [...(msg.deliveredTo || []), userId].filter((v, i, a) => a.indexOf(v) === i)
        const memberStatuses = updateMemberStatus(msg.memberStatuses, userId, { deliveredAt })
        return { deliveredTo, memberStatuses, status: status || msg.status }
      })
    }
    const handleGroupMsgRead      = ({ messageId, userId, readAt, status }) => {
      editMessageInStore(messageId, (msg) => {
        const readBy         = [...(msg.readBy || []), userId].filter((v, i, a) => a.indexOf(v) === i)
        const deliveredTo    = [...(msg.deliveredTo || []), userId].filter((v, i, a) => a.indexOf(v) === i)
        const memberStatuses = updateMemberStatus(msg.memberStatuses, userId, { readAt, deliveredAt: msg.deliveredAt })
        return { readBy, deliveredTo, memberStatuses, status: status || msg.status }
      })
    }

    const handleTypingStart      = ({ userId, userName }) => startTypingAutoExpire(userId, userName || userId)
    const handleTypingStop       = ({ userId }) => stopTyping(userId)
    const handleGroupTypingStart = ({ userId, userName }) => startTypingAutoExpire(userId, userName || userId)
    const handleGroupTypingStop  = ({ userId }) => stopTyping(userId)

    const handleUserTyping  = ({ userId, isTyping }) => setTyping(userId, isTyping)
    const handleUserOnline  = ({ userId, isOnline }) => updateUserOnline(userId, isOnline)

    const handleReceiveRequest  = ({ roomId: reqRoomId, senderId, senderName }) => {
      addPendingRoom({ id: reqRoomId, participantIds: [senderId], isGroup: false, status: 'pending',
        otherUser: { id: senderId?.toString(), name: senderName }, lastMessage: null })
    }
    const handleRequestAccepted = ({ roomId: rId }) => moveToAccepted(rId)
    const handleRequestRejected = ({ roomId: rId }) => removePendingRoom(rId)
    const handleMessageBlocked  = ({ tempId }) => { if (tempId) removeMessage(tempId) }
    const handleMessageEdited   = ({ messageId, content, editedAt }) => {
      editMessageInStore(messageId, { content, isEdited: true, editedAt })
    }
    const handleMessageDeleted  = ({ messageId, deleteFor }) => {
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

    on(RECEIVE_MESSAGE,     handleReceiveMessage)
    on(MESSAGE_SENT,        handleMessageSent)
    on(MSG_DELIVERED,       handleMsgDelivered)
    on(MSG_READ,            handleMsgRead)
    on(GROUP_MSG_DELIVERED, handleGroupMsgDelivered)
    on(GROUP_MSG_READ,      handleGroupMsgRead)
    on(TYPING_START,        handleTypingStart)
    on(TYPING_STOP,         handleTypingStop)
    on(GROUP_TYPING_START,  handleGroupTypingStart)
    on(GROUP_TYPING_STOP,   handleGroupTypingStop)
    on(USER_TYPING,         handleUserTyping)
    on(USER_STOP_TYPING,    ({ userId }) => setTyping(userId, false))
    on(USER_ONLINE,         handleUserOnline)
    on(RECEIVE_REQUEST,     handleReceiveRequest)
    on(REQUEST_ACCEPTED,    handleRequestAccepted)
    on(REQUEST_REJECTED,    handleRequestRejected)
    on(NOTIFICATION_NEW,    handleNotificationNew)
    on(MESSAGE_BLOCKED,     handleMessageBlocked)
    on(MESSAGE_EDITED,      handleMessageEdited)
    on(MESSAGE_DELETED,     handleMessageDeleted)

    return () => {
      Object.keys(typingTimers.current).forEach(clearTypingTimer)
      off(RECEIVE_MESSAGE,     handleReceiveMessage)
      off(MESSAGE_SENT,        handleMessageSent)
      off(MSG_DELIVERED,       handleMsgDelivered)
      off(MSG_READ,            handleMsgRead)
      off(GROUP_MSG_DELIVERED, handleGroupMsgDelivered)
      off(GROUP_MSG_READ,      handleGroupMsgRead)
      off(TYPING_START,        handleTypingStart)
      off(TYPING_STOP,         handleTypingStop)
      off(GROUP_TYPING_START,  handleGroupTypingStart)
      off(GROUP_TYPING_STOP,   handleGroupTypingStop)
      off(USER_TYPING,         handleUserTyping)
      off(USER_ONLINE,         handleUserOnline)
      off(RECEIVE_REQUEST,     handleReceiveRequest)
      off(REQUEST_ACCEPTED,    handleRequestAccepted)
      off(REQUEST_REJECTED,    handleRequestRejected)
      off(NOTIFICATION_NEW,    handleNotificationNew)
      off(MESSAGE_BLOCKED,     handleMessageBlocked)
      off(MESSAGE_EDITED,      handleMessageEdited)
      off(MESSAGE_DELETED,     handleMessageDeleted)
      setMessages([])
    }
  }, [roomId])

  /**
   * Send a message. If the room has an E2E key available, the message is
   * encrypted before being sent; otherwise it falls back to plaintext.
   */
  const sendMessage = async (content, type = 'text', fileUrl = null, fileName = null, mimeType = null, fileDuration = null, replyContext = null) => {
    const tempId    = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    let   payload   = { content, roomId, type, fileUrl, fileName, mimeType, fileDuration, tempId, replyTo: replyContext }

    // Attempt E2E encryption for text messages
    if (type === 'text') {
      try {
        const roomKey = await getRoomKey(roomId, currentUser?.id?.toString())
        if (roomKey) {
          const { ciphertext, iv, authTag } = await encryptMessage(content, roomKey)
          payload = { ...payload, content: ciphertext, iv, authTag, encrypted: true }
        }
      } catch {
        // Encryption failed — fall through to plaintext
      }
    }

    const optimistic = {
      id:          tempId,
      content,                  // show plaintext optimistically
      senderId:    currentUser?.id?.toString(),
      senderName:  currentUser?.name || 'You',
      senderAvatar: currentUser?.avatar || null,
      roomId,
      timestamp:   new Date().toISOString(),
      sentAt:      new Date().toISOString(),
      type,
      fileUrl,
      fileName,
      mimeType,
      fileDuration,
      status:      'sent',
      encrypted:   payload.encrypted || false,
      replyTo:     replyContext,
    }
    addMessage(optimistic)
    emit(SEND_MESSAGE, payload)
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

  const requestMessageInfo = (messageId) => {
    emit(MESSAGE_INFO_REQ, { messageId })
  }

  return { messages, rooms, activeRoomId, typingUsers, sendMessage, editMessage, deleteMessage, requestMessageInfo }
}

// ── Helper: update a memberStatuses entry ────────────────────────────────────
function updateMemberStatus(memberStatuses = [], userId, patch) {
  const list = [...memberStatuses]
  const idx  = list.findIndex(ms =>
    (ms.userId?._id || ms.userId) === userId || ms.userId?.toString?.() === userId?.toString?.()
  )
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch }
  } else {
    list.push({ userId, ...patch })
  }
  return list
}