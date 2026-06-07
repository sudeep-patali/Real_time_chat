import api from '../config/api.config'

export const fetchHistory      = (roomId) =>
  api.get(`/messages/${roomId}`)

export const sendMessage       = (roomId, content, type = 'text', fileUrl = null) =>
  api.post('/messages', { roomId, content, type, fileUrl })

export const editMessage       = (messageId, content) =>
  api.put(`/messages/${messageId}`, { content })

export const deleteMessage     = (messageId, deleteFor = 'me') =>
  api.delete(`/messages/${messageId}`, { data: { deleteFor } })

export const markRead          = (roomId) =>
  api.post(`/messages/${roomId}/read`)

export const getUnreadCount    = (roomId) =>
  api.get(`/messages/${roomId}/unread-count`)

// Bulk fetch unread counts for ALL rooms the user belongs to.
// Returns { unreadCounts: { [roomId]: number } }
export const getAllUnreadCounts = () =>
  api.get('/messages/unread-counts')

export const getSharedMedia    = (roomId) =>
  api.get(`/rooms/${roomId}/media`)

export const clearChat         = (roomId) =>
  api.delete(`/rooms/${roomId}/messages`)