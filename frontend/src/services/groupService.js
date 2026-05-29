import api from '../config/api.config'

export const getGroupById = (roomId) => api.get(`/rooms/${roomId}`)
export const removeMember = (roomId, userId) => api.delete(`/rooms/${roomId}/members/${userId}`)
export const exitGroup = (roomId) => api.post(`/rooms/${roomId}/leave`)
export const updateGroup = (roomId, data) => api.put(`/rooms/${roomId}`, data)