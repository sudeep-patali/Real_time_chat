import api from '../config/api.config'

export const getNotifications = () =>
  api.get('/notifications')

export const markAllRead = () =>
  api.patch('/notifications/read-all')

export const markOneRead = (id) =>
  api.patch(`/notifications/${id}/read`)

export const clearAll = () =>
  api.delete('/notifications')