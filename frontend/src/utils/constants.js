export const MAX_MESSAGE_LENGTH = 2000
export const MAX_FILE_SIZE      = 50 * 1024 * 1024   // 50 MB

export const SUPPORTED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

export const MEDIA_TYPE_MAP = {
  'image/jpeg':    'image',
  'image/jpg':     'image',
  'image/png':     'image',
  'image/gif':     'gif',       // GIFs get their own type for animated preview
  'image/webp':    'image',
  'video/mp4':     'video',
  'video/webm':    'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'text/plain': 'document',
}

export const API_TIMEOUT    = 10000
export const TOAST_DURATION = 3000
export const ROUTE_PATHS    = {
  HOME: '/', LOGIN: '/login', SIGNUP: '/signup',
  CHAT: '/chat/:roomId', GROUP: '/group/:roomId',
  PROFILE: '/profile', SETTINGS: '/settings',
}