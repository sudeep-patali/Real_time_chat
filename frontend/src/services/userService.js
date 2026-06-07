import api from '../config/api.config';

export const getAllUsers   = ()               => api.get('/users');
export const searchUsers  = (query)          => api.get(`/users/search?q=${encodeURIComponent(query)}`);
export const getUserById  = (userId)         => api.get(`/users/${userId}`);
export const updateProfile = (data)          => api.put('/users/me', data);
export const blockUser    = (userId)         => api.post(`/users/${userId}/block`);
export const reportUser   = (userId, reason) => api.post(`/users/${userId}/report`, { reason });
export const muteUser     = (userId)         => api.post(`/users/${userId}/mute`);

// New endpoints for enhanced profile
export const getBlockedUsers = ()            => api.get('/users/me/blocked');
export const getUserStats    = ()            => api.get('/users/me/stats');
export const updatePrivacy   = (settings)    => api.put('/users/me/privacy', settings);