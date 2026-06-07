import { useEffect, useCallback, useRef } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import * as notificationService from '../services/notificationService'
import { useSocket } from './useSocket'
import { NOTIFICATION_NEW, NOTIFICATION_READ_ALL, RECEIVE_MESSAGE, UNREAD_INCREMENT } from '../socket/socketEvents'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'

// ── Web Audio API notification sound ──────────────────────────────────────
function playNotificationSound(type = 'message') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    if (type === 'message') {
      // WhatsApp-style double-tone
      const playTone = (freq, startTime, duration) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }
      const now = ctx.currentTime
      playTone(880, now,       0.12)
      playTone(660, now + 0.14, 0.18)
    } else if (type === 'group') {
      // Three rising tones for group
      const now = ctx.currentTime
      ;[880, 1046, 1318].forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.1)
        gain.gain.setValueAtTime(0.2, now + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15)
        osc.start(now + i * 0.1)
        osc.stop(now + i * 0.1 + 0.15)
      })
    }
  } catch {
    // AudioContext not supported — silently fail
  }
}

// ── Browser Notification API ───────────────────────────────────────────────
async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

function showBrowserNotification(title, body, icon = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return // Only show when tab is hidden
  try {
    const n = new Notification(title, { body, icon: icon || '/favicon.ico', silent: true })
    setTimeout(() => n.close(), 5000)
  } catch {}
}

export function useNotification() {
  const unreadCounts         = useNotificationStore(state => state.unreadCounts)
  const alerts               = useNotificationStore(state => state.alerts)
  const notifications        = useNotificationStore(state => state.notifications)
  const setNotifications     = useNotificationStore(state => state.setNotifications)
  const addNotification      = useNotificationStore(state => state.addNotification)
  const markAllReadStore     = useNotificationStore(state => state.markAllRead)
  const markNotificationRead = useNotificationStore(state => state.markNotificationRead)
  const clearNotifications   = useNotificationStore(state => state.clearNotifications)
  const incrementUnread      = useNotificationStore(state => state.incrementUnread)
  const clearUnread          = useNotificationStore(state => state.clearUnread)

  const { on, off, emit }  = useSocket()
  const currentUser        = useAuthStore(state => state.currentUser)
  const activeRoomId       = useChatStore(state => state.activeRoomId)
  const rooms              = useChatStore(state => state.rooms)

  // Muted rooms set for sound gating
  const mutedRoomIds = useRef(new Set())
  useEffect(() => {
    mutedRoomIds.current = new Set(
      rooms.filter(r => r.isMuted).map(r => (r._id || r.id)?.toString())
    )
  }, [rooms])

  // Request browser notification permission on mount
  useEffect(() => {
    requestBrowserNotificationPermission()
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await notificationService.getNotifications()
      setNotifications(res.data.notifications || [])
    } catch {}
  }, [currentUser, setNotifications])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Re-fetch when tab regains focus
  useEffect(() => {
    const handleFocus = () => fetchNotifications()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchNotifications])

  // ── RECEIVE_MESSAGE → unread badge + sound ─────────────────────────────
  useEffect(() => {
    const handleReceiveMessage = ({ message }) => {
      if (!message) return
      const roomId   = message.roomId?.toString()
      const senderId = message.senderId?.toString() || message.sender?._id?.toString()

      // Never count own messages
      if (senderId === currentUser?.id?.toString()) return

      const isActiveRoom = roomId && activeRoomId && roomId === activeRoomId.toString()
      const isMuted      = mutedRoomIds.current.has(roomId)

      // Increment unread badge only if not in active room
      if (!isActiveRoom && roomId) {
        incrementUnread(roomId)
      }

      // Play sound only for incoming messages in non-muted, non-active rooms
      if (!isActiveRoom && !isMuted) {
        const isGroup = rooms.find(r => (r._id || r.id)?.toString() === roomId)?.isGroup
        playNotificationSound(isGroup ? 'group' : 'message')
      }

      // Browser notification when tab hidden
      if (!isActiveRoom) {
        const senderName = message.senderName || message.sender?.name || 'Someone'
        const preview    = message.type === 'image' ? '📷 Photo'
                         : message.type === 'video' ? '🎥 Video'
                         : message.type === 'audio' ? '🎤 Voice message'
                         : message.type === 'file'  ? '📎 File'
                         : (message.content || 'New message').slice(0, 60)
        showBrowserNotification(senderName, preview, message.sender?.avatar || null)
      }
    }

    on(RECEIVE_MESSAGE, handleReceiveMessage)
    return () => off(RECEIVE_MESSAGE, handleReceiveMessage)
  }, [currentUser, activeRoomId, rooms, on, off, incrementUnread])

  // ── UNREAD_INCREMENT from server ───────────────────────────────────────
  useEffect(() => {
    const handle = ({ roomId }) => {
      if (!roomId) return
      const activeStr = activeRoomId?.toString()
      if (roomId.toString() !== activeStr) {
        incrementUnread(roomId.toString())
      }
    }
    on(UNREAD_INCREMENT, handle)
    return () => off(UNREAD_INCREMENT, handle)
  }, [activeRoomId, on, off, incrementUnread])

  // ── NOTIFICATION_NEW socket event ──────────────────────────────────────
  useEffect(() => {
    const handleNewNotification = ({ notification, receiverId }) => {
      if (receiverId?.toString() === currentUser?.id?.toString()) {
        addNotification(notification)
        // Light sound for system notifications (not message-triggered)
        if (!['message'].includes(notification?.type)) {
          playNotificationSound('message')
        }
      }
    }
    on(NOTIFICATION_NEW, handleNewNotification)
    return () => off(NOTIFICATION_NEW, handleNewNotification)
  }, [currentUser, on, off, addNotification])

  // ── Auto-clear unread when room becomes active ─────────────────────────
  useEffect(() => {
    if (activeRoomId) clearUnread(activeRoomId.toString())
  }, [activeRoomId, clearUnread])

  const totalUnread         = Object.values(unreadCounts).reduce((acc, c) => acc + (c || 0), 0)
  const unreadNotifications = notifications.filter(n => !n.isRead && !n.read).length

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      markAllReadStore()
      emit(NOTIFICATION_READ_ALL, {})
    } catch {}
  }

  const markOneRead = async (id) => {
    try { await notificationService.markOneRead(id); markNotificationRead(id) } catch {}
  }

  const clearAll = async () => {
    try { await notificationService.clearAll(); clearNotifications() } catch {}
  }

  return {
    unreadCounts,
    totalUnread,
    alerts,
    notifications,
    unreadNotifications,
    markAllRead,
    markNotificationRead: markOneRead,
    addNotification,
    clearAll,
    clearUnread,
    refetchNotifications: fetchNotifications,
    playNotificationSound,
  }
}