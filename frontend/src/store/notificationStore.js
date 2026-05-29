import { create } from 'zustand'

export const useNotificationStore = create((set) => ({
  unreadCounts: {
    room1: 3,
    room2: 1,
  },
  alerts: [],

  // Mock notification list (frontend only)
  notifications: [
    {
      id: 'n1',
      type: 'message',
      title: 'Alex',
      body: 'Hey! How are you doing?',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
      read: false,
      avatar: null,
    },
    {
      id: 'n2',
      type: 'group',
      title: 'Team Wheeltrix',
      body: 'Jordan: Welcome to the group!',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
      read: false,
      avatar: null,
    },
    {
      id: 'n3',
      type: 'message',
      title: 'User 3',
      body: 'See you tomorrow 👋',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hr ago
      read: true,
      avatar: null,
    },
    {
      id: 'n4',
      type: 'system',
      title: 'Wheeltrix',
      body: 'Your profile was updated successfully.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hrs ago
      read: true,
      avatar: null,
    },
  ],

  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1,
      },
    })),

  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: 0,
      },
    })),

  markAllRead: () =>
    set((state) => ({
      unreadCounts: Object.fromEntries(
        Object.keys(state.unreadCounts).map(k => [k, 0])
      ),
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

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