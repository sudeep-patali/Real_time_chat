import api from '../config/api.config'

export const getUserById = (userId) => api.get(`/users/${userId}`)
export const updateProfile = (data) => api.put('/users/me', data)
export const blockUser = (userId) => api.post(`/users/${userId}/block`)
export const searchUsers = (query) => api.get(`/users/search?q=${query}`)