import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import * as notificationService from '../services/notificationService'
import { useSocket } from './useSocket'
import { NOTIFICATION_NEW, NOTIFICATION_READ_ALL } from '../socket/socketEvents'
import { useAuthStore } from '../store/authStore'

export function useNotification() {
  const unreadCounts         = useNotificationStore(state => state.unreadCounts)
  const alerts               = useNotificationStore(state => state.alerts)
  const notifications        = useNotificationStore(state => state.notifications)
  const setNotifications     = useNotificationStore(state => state.setNotifications)
  const addNotification      = useNotificationStore(state => state.addNotification)
  const markAllReadStore     = useNotificationStore(state => state.markAllRead)
  const markNotificationRead = useNotificationStore(state => state.markNotificationRead)
  const clearNotifications   = useNotificationStore(state => state.clearNotifications)

  const { on, off, emit } = useSocket()
  const currentUser       = useAuthStore(state => state.currentUser)

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await notificationService.getNotifications()
      setNotifications(res.data.notifications || [])
    } catch {}
  }, [currentUser, setNotifications])

  // Always fetch fresh on mount + when user changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Re-fetch when the tab regains focus
  useEffect(() => {
    const handleFocus = () => fetchNotifications()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchNotifications])

  // Listen for new notifications via socket
  useEffect(() => {
    const handleNewNotification = ({ notification, receiverId }) => {
      if (receiverId?.toString() === currentUser?.id?.toString()) {
        addNotification(notification)
        playNotificationSound()
      }
    }
    on(NOTIFICATION_NEW, handleNewNotification)
    return () => off(NOTIFICATION_NEW, handleNewNotification)
  }, [currentUser, on, off, addNotification])

  const totalUnread        = Object.values(unreadCounts).reduce((acc, c) => acc + c, 0)
  const unreadNotifications = notifications.filter(n => !n.isRead && !n.read).length

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      markAllReadStore()
      emit(NOTIFICATION_READ_ALL, {})
    } catch (err) {
      console.error('markAllRead error:', err)
    }
  }

  const markOneRead = async (id) => {
    try {
      await notificationService.markOneRead(id)
      markNotificationRead(id)
    } catch (err) {
      console.error('markOneRead error:', err)
    }
  }

  const clearAll = async () => {
    try {
      await notificationService.clearAll()
      clearNotifications()
    } catch (err) {
      console.error('clearAll error:', err)
    }
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
    refetchNotifications: fetchNotifications,
  }
}

function playNotificationSound() {
  try {
    const ctx        = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode   = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch {}
}