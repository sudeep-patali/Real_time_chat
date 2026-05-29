export const MAX_MESSAGE_LENGTH = 2000
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
]
export const API_TIMEOUT = 10000
export const TOAST_DURATION = 3000
export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CHAT: '/chat/:roomId',
  GROUP: '/group/:roomId',
  PROFILE: '/profile',
  SETTINGS: '/settings',
}