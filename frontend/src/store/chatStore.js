import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  activeRoomId: null,
  messages: [],
  rooms: [
    {
      id: 'room1',
      participantIds: ['1', '2'],
      lastMessage: { content: 'Hey there!', timestamp: new Date().toISOString() },
      isGroup: false,
      groupName: null,
      avatarUrl: null,
    },
    {
      id: 'room2',
      participantIds: ['1', '3'],
      lastMessage: { content: 'See you tomorrow', timestamp: new Date().toISOString() },
      isGroup: false,
      groupName: null,
      avatarUrl: null,
    },
    {
      id: 'room3',
      participantIds: ['1', '2', '3'],
      lastMessage: { content: 'Welcome to the group!', timestamp: new Date().toISOString() },
      isGroup: true,
      groupName: 'Team Wheeltrix',
      avatarUrl: null,
    },
  ],
  typingUsers: [],
  onlineUsers: ['2'],

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setRooms: (rooms) => set({ rooms }),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: isTyping
        ? [...state.typingUsers.filter(id => id !== userId), userId]
        : state.typingUsers.filter(id => id !== userId),
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: isOnline
        ? [...state.onlineUsers.filter(id => id !== userId), userId]
        : state.onlineUsers.filter(id => id !== userId),
    })),
}))