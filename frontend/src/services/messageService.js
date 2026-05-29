import api from '../config/api.config'

export const fetchHistory = (roomId) => api.get(`/messages/${roomId}`)
export const sendMessage = (roomId, content, type = 'text') => api.post('/messages', { roomId, content, type })
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`)
export const markRead = (roomId) => api.post(`/messages/${roomId}/read`)
export const getSharedMedia = (roomId) => api.get(`/rooms/${roomId}/media`)
export const clearChat = (roomId) => api.delete(`/rooms/${roomId}/messages`)