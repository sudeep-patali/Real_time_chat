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
export const getAllUnreadCounts = () =>
  api.get('/messages/unread-counts')

export const getSharedMedia    = (roomId) =>
  api.get(`/rooms/${roomId}/media`)

export const clearChat         = (roomId) =>
  api.delete(`/rooms/${roomId}/messages`)

// Message Info — delivery + read details for a single message
export const getMessageInfo    = (messageId) =>
  api.get(`/messages/info/${messageId}`)

// Report a message
export const reportMessage     = (messageId, reason) =>
  api.post(`/messages/${messageId}/report`, { reason })

// Star / unstar — client-side only (stored in localStorage)
const STARRED_KEY = 'starred_messages'
export const getStarredIds = () => {
  try { return JSON.parse(localStorage.getItem(STARRED_KEY) || '[]') } catch { return [] }
}
export const toggleStar = (messageId) => {
  const starred = getStarredIds()
  const idx = starred.indexOf(messageId)
  if (idx === -1) starred.push(messageId)
  else starred.splice(idx, 1)
  localStorage.setItem(STARRED_KEY, JSON.stringify(starred))
  return idx === -1  // returns true if now starred
}