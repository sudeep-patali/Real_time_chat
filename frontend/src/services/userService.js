import api from '../config/api.config';

export const getAllUsers  = ()               => api.get('/users');
export const searchUsers = (query)          => api.get(`/users/search?q=${encodeURIComponent(query)}`);
export const getUserById = (userId)         => api.get(`/users/${userId}`);
export const updateProfile = (data)         => api.put('/users/me', data);
export const blockUser   = (userId)         => api.post(`/users/${userId}/block`);
export const reportUser  = (userId, reason) => api.post(`/users/${userId}/report`, { reason });
export const muteUser    = (userId)         => api.post(`/users/${userId}/mute`);