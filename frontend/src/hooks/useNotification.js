import { useNotificationStore } from '../store/notificationStore'

export function useNotification() {
  const unreadCounts        = useNotificationStore(state => state.unreadCounts)
  const alerts              = useNotificationStore(state => state.alerts)
  const notifications       = useNotificationStore(state => state.notifications)
  const addNotification =
  useNotificationStore(state => state.addNotification)
  const markAllRead         = useNotificationStore(state => state.markAllRead)
  const markNotificationRead = useNotificationStore(state => state.markNotificationRead)

  const totalUnread = Object.values(unreadCounts)
    .reduce((acc, count) => acc + count, 0)

  const unreadNotifications = notifications.filter(n => !n.read).length

  return {
    unreadCounts,
    totalUnread,
    alerts,
    notifications,
    unreadNotifications,
    markAllRead,
    markNotificationRead,
    addNotification
  }
}