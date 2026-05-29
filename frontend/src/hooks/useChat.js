import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useSocket } from './useSocket'
import * as messageService from '../services/messageService'
import {
  RECEIVE_MESSAGE,
  USER_TYPING,
  USER_STOP_TYPING,
  USER_ONLINE,
  JOIN_ROOM,
  LEAVE_ROOM,
  SEND_MESSAGE
} from '../socket/socketEvents'

export function useChat(roomId) {
  const messages = useChatStore(state => state.messages)
  const rooms = useChatStore(state => state.rooms)
  const activeRoomId = useChatStore(state => state.activeRoomId)
  const typingUsers = useChatStore(state => state.typingUsers)
  const setMessages = useChatStore(state => state.setMessages)
  const addMessage = useChatStore(state => state.addMessage)
  const setActiveRoom = useChatStore(state => state.setActiveRoom)
  const setTyping = useChatStore(state => state.setTyping)
  const updateUserOnline = useChatStore(state => state.updateUserOnline)
  const clearUnread = useNotificationStore(state => state.clearUnread)
  const incrementUnread = useNotificationStore(state => state.incrementUnread)
  const { emit, on, off } = useSocket()

  useEffect(() => {
    if (!roomId) return

    setActiveRoom(roomId)
    clearUnread(roomId)

    // Load message history
    messageService.fetchHistory(roomId).then(res => {
      setMessages(res.data.messages)
    })

    // Join room on socket
    emit(JOIN_ROOM, { roomId })

    // Socket listeners
    const handleReceiveMessage = (payload) => {
      addMessage(payload.message)
      if (payload.message.roomId !== roomId) {
        incrementUnread(payload.message.roomId)
      }
    }

    const handleUserTyping = ({ userId, isTyping }) => {
      setTyping(userId, isTyping)
    }

    const handleUserOnline = ({ userId, isOnline }) => {
      updateUserOnline(userId, isOnline)
    }

    on(RECEIVE_MESSAGE, handleReceiveMessage)
    on(USER_TYPING, handleUserTyping)
    on(USER_STOP_TYPING, ({ userId }) => setTyping(userId, false))
    on(USER_ONLINE, handleUserOnline)

    return () => {
      off(RECEIVE_MESSAGE, handleReceiveMessage)
      off(USER_TYPING, handleUserTyping)
      off(USER_ONLINE, handleUserOnline)
      emit(LEAVE_ROOM, { roomId })
      setMessages([])
    }
  }, [roomId])

  const sendMessage = async (content) => {
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      content,
      senderId: '1',
      senderName: 'Test User',
      roomId,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    // Optimistic update
    addMessage(optimisticMsg)

    // Emit to socket (Phase 5 — real backend)
    emit(SEND_MESSAGE, { content, roomId, type: 'text' })

    // Also call REST as fallback during dummy phase
    await messageService.sendMessage(roomId, content)
  }

  return {
    messages,
    rooms,
    activeRoomId,
    typingUsers,
    sendMessage
  }
}