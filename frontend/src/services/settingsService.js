import api from '../config/api.config'

export const getSettings       = ()       => api.get('/users/me/settings')
export const updateSettings    = (data)   => api.put('/users/me/settings', data)
export const changePassword    = (data)   => api.put('/auth/change-password', data)
export const forgotPassword    = (email)  => api.post('/auth/forgot-password', { email })
export const verifyOtp         = (data)   => api.post('/auth/verify-otp', data)
export const exportChatHistory = ()       => api.get('/users/me/export', { responseType: 'blob' })
export const downloadMyData    = ()       => api.get('/users/me/data', { responseType: 'blob' })
export const deleteAccount     = (pass)   => api.delete('/users/me', { data: { password: pass } })
export const getSessions       = ()       => api.get('/users/me/sessions')
export const deleteSession     = (id)     => api.delete(`/users/me/sessions/${id}`)
export const deleteAllSessions = ()       => api.delete('/users/me/sessions')
export const getSecurityLogs   = ()       => api.get('/users/me/security-logs')
export const logoutAllDevices  = ()       => api.delete('/auth/sessions')

// Phase 1: Notify the backend that the current tab cleared its cache.
// The backend emits 'cacheCleared' to the user's personal Socket.IO room
// so all other open tabs of the same user wipe their localStorage too.
export const clearCacheAPI     = ()       => api.post('/users/me/clear-cache')