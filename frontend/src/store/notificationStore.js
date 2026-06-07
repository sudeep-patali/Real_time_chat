import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  unreadCounts:  {},   // { [roomId]: number }  — authoritative unread badge counts
  alerts:        [],
  notifications: [],

  // ── Unread counts per room ──────────────────────────────────────────────

  // Seed ALL room counts at once from the server's bulk response.
  // Called once on app load from useRooms so the badges are accurate on refresh.
  setUnreadCounts: (countsMap) =>
    set({ unreadCounts: countsMap }),

  // Called only when a new message arrives for a room we do NOT have open.
  // We add exactly 1 — the socket guarantees one event per message.
  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1,
      },
    })),

  // Called when the user opens a chat (clears badge immediately in UI).
  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),

  // ── Notifications list ──────────────────────────────────────────────────
  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.some(n => n.id === notification.id)
      if (exists) return state
      return { notifications: [notification, ...state.notifications] }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true, read: true })),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true, read: true } : n
      ),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // ── Toast alerts ────────────────────────────────────────────────────────
  addAlert: ({ message, type = 'info' }) =>
    set((state) => ({
      alerts: [
        ...state.alerts,
        { id: Date.now().toString(), message, type },
      ],
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}))