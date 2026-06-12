import { create } from 'zustand';

export const useChatStore = create((set) => ({
  activeRoomId:   null,
  messages:       [],
  rooms:          [],
  pendingRooms:   [],
  typingUsers:    [],
  typingUserMap:  {},
  onlineUsers:    [],

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  addMessage: (message) =>
    set((state) => {
      const msgRoomId    = message.roomId?.toString()
      const activeRoomId = state.activeRoomId?.toString()
      if (msgRoomId && activeRoomId && msgRoomId !== activeRoomId) return state

      const exists = state.messages.some(m => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    }),

  replaceMessage: (tempId, realMessage) =>
    set((state) => ({
      messages: state.messages.map(m => m.id === tempId ? realMessage : m)
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter(m => m.id !== messageId)
    })),

  // Accepts either a plain patch object OR a function (msg) => patch
  editMessageInStore: (messageId, patchOrFn) =>
    set((state) => ({
      messages: state.messages.map(m => {
        if (m.id !== messageId) return m
        const patch = typeof patchOrFn === 'function' ? patchOrFn(m) : patchOrFn
        return { ...m, ...patch }
      })
    })),

  // Update multiple messages at once (e.g. mark-all-read)
  bulkEditMessagesInStore: (messageIds, patchOrFn) =>
    set((state) => {
      const idSet = new Set(messageIds)
      return {
        messages: state.messages.map(m => {
          if (!idSet.has(m.id)) return m
          const patch = typeof patchOrFn === 'function' ? patchOrFn(m) : patchOrFn
          return { ...m, ...patch }
        })
      }
    }),

  setMessages: (messages) => set({ messages }),

  setRooms: (serverRooms) =>
    set((state) => {
      const serverIds = new Set(serverRooms.map(r => (r.id || r._id)?.toString()))
      const optimisticOnly = state.rooms.filter(
        r => !serverIds.has((r.id || r._id)?.toString())
      )
      const merged = serverRooms.map(serverRoom => {
        const rid = (serverRoom.id || serverRoom._id)?.toString()
        const existing = state.rooms.find(r => (r.id || r._id)?.toString() === rid)
        if (existing?.otherUser?.name && !serverRoom.otherUser?.name) {
          return { ...serverRoom, otherUser: existing.otherUser }
        }
        return serverRoom
      })
      return { rooms: [...optimisticOnly, ...merged] }
    }),

  addRoom: (room) =>
    set((state) => {
      const id = (room.id || room._id)?.toString()
      const existingIdx = state.rooms.findIndex(r => (r.id || r._id)?.toString() === id)
      if (existingIdx !== -1) {
        const existing = state.rooms[existingIdx]
        const merged = {
          ...existing,
          ...room,
          otherUser: (room.otherUser?.name ? room.otherUser : existing.otherUser) || room.otherUser,
        }
        const updated = [...state.rooms]
        updated[existingIdx] = merged
        return { rooms: updated }
      }
      return { rooms: [room, ...state.rooms] }
    }),

  updateRoom: (roomId, patch) =>
    set((state) => ({
      rooms: state.rooms.map(r =>
        (r._id || r.id) === roomId ? { ...r, ...patch } : r
      )
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter(r => (r._id || r.id) !== roomId)
    })),

  toggleMuteRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map(r =>
        (r._id || r.id) === roomId ? { ...r, isMuted: !r.isMuted } : r
      )
    })),

  setPendingRooms: (pendingRooms) => set({ pendingRooms }),

  addPendingRoom: (room) =>
    set((state) => ({
      pendingRooms: [room, ...state.pendingRooms.filter(r => r.id !== room.id)]
    })),

  removePendingRoom: (roomId) =>
    set((state) => ({
      pendingRooms: state.pendingRooms.filter(r => r.id !== roomId)
    })),

  moveToAccepted: (roomId) =>
    set((state) => {
      const room = state.pendingRooms.find(r => r.id === roomId);
      if (!room) return state;
      return {
        pendingRooms: state.pendingRooms.filter(r => r.id !== roomId),
        rooms: [{ ...room, status: 'accepted' }, ...state.rooms]
      };
    }),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: isTyping
        ? [...state.typingUsers.filter(id => id !== userId), userId]
        : state.typingUsers.filter(id => id !== userId)
    })),

  setTypingUser: (userId, userName, isTyping) =>
    set((state) => {
      const uid = userId?.toString()
      const newMap = { ...state.typingUserMap }
      if (isTyping && userName) {
        newMap[uid] = userName
      } else {
        delete newMap[uid]
      }
      const typingUsers = isTyping
        ? [...state.typingUsers.filter(id => id !== uid), uid]
        : state.typingUsers.filter(id => id !== uid)
      return { typingUserMap: newMap, typingUsers }
    }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: isOnline
        ? [...state.onlineUsers.filter(id => id !== userId), userId]
        : state.onlineUsers.filter(id => id !== userId)
    })),

  // Update avatar/name for a user across all rooms and messages
  updateUserProfile: (userId, patch) =>
    set((state) => {
      const uid = userId?.toString()
      const applyToParticipant = (p) => {
        const pid = (p._id || p.id)?.toString()
        if (pid !== uid) return p
        return { ...p, ...patch }
      }
      const applyToRoom = (r) => {
        const otherUser = r.otherUser && (r.otherUser._id || r.otherUser.id)?.toString() === uid
          ? { ...r.otherUser, ...patch }
          : r.otherUser
        const participantIds = (r.participantIds || []).map(applyToParticipant)
        return { ...r, otherUser, participantIds }
      }
      const applyToMessage = (m) => {
        if ((m.senderId || m.sender?._id || m.sender?.id)?.toString() !== uid) return m
        const sender = m.sender ? { ...m.sender, ...patch } : m.sender
        return { ...m, sender, senderAvatar: patch.avatar ?? m.senderAvatar, senderName: patch.name ?? m.senderName }
      }
      return {
        rooms:        state.rooms.map(applyToRoom),
        pendingRooms: state.pendingRooms.map(applyToRoom),
        messages:     state.messages.map(applyToMessage),
      }
    }),

  // Update privacy-related fields for a user across all rooms
  // Called when server emits 'privacy_updated' or a filtered 'user_profile_updated'
  updateUserPrivacyInRooms: (userId, patch) =>
    set((state) => {
      const uid = userId?.toString()
      const applyToParticipant = (p) => {
        const pid = (p._id || p.id)?.toString()
        if (pid !== uid) return p
        return { ...p, ...patch }
      }
      const applyToRoom = (r) => {
        const otherUser = r.otherUser && (r.otherUser._id || r.otherUser.id)?.toString() === uid
          ? { ...r.otherUser, ...patch }
          : r.otherUser
        const participantIds = (r.participantIds || []).map(applyToParticipant)
        return { ...r, otherUser, participantIds }
      }
      return {
        rooms:        state.rooms.map(applyToRoom),
        pendingRooms: state.pendingRooms.map(applyToRoom),
      }
    }),

  updateLastMessage: (roomId, message) =>
    set((state) => {
      const roomIdStr = roomId?.toString()
      const lastMsg = {
        content:   message.content,
        timestamp: message.timestamp,
        type:      message.type || 'text',
        fileName:  message.fileName || null
      }

      const updatedRooms = state.rooms.map(r =>
        (r._id || r.id)?.toString() === roomIdStr
          ? { ...r, lastMessage: lastMsg }
          : r
      )

      const updatedPending = state.pendingRooms.map(r =>
        (r._id || r.id)?.toString() === roomIdStr
          ? { ...r, lastMessage: lastMsg }
          : r
      )

      return { rooms: updatedRooms, pendingRooms: updatedPending }
    })
}));