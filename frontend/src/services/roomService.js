import api from '../config/api.config';

export const getRooms      = ()               => api.get('/rooms');
export const getRequests   = ()               => api.get('/rooms/requests');
export const createRoom    = (data)           => api.post('/rooms', data);
export const getRoomById   = (roomId)         => api.get(`/rooms/${roomId}`);
export const acceptRequest = (roomId)         => api.patch(`/rooms/${roomId}/accept`);
export const rejectRequest = (roomId)         => api.patch(`/rooms/${roomId}/reject`);
export const getRoomMedia  = (roomId)         => api.get(`/media/rooms/${roomId}/media`);
export const clearChat     = (roomId)         => api.delete(`/rooms/${roomId}/messages`);
export const leaveRoom     = (roomId)         => api.post(`/rooms/${roomId}/leave`);
export const muteRoom      = (roomId)         => api.post(`/rooms/${roomId}/mute`);
export const reportRoom    = (roomId, reason) => api.post(`/rooms/${roomId}/report`, { reason });