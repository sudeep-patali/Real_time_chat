// ── Outbound (client → server) ────────────────────────────────────────────────
export const JOIN_ROOM          = 'join_room'
export const LEAVE_ROOM         = 'leave_room'
export const SEND_MESSAGE       = 'send_message'
export const USER_TYPING        = 'user_typing'
export const USER_STOP_TYPING   = 'user_stop_typing'
export const MESSAGE_READ       = 'message_read'
export const MESSAGE_DELIVERED  = 'message_delivered'
export const MESSAGE_EDIT       = 'message:edit'
export const MESSAGE_DELETE     = 'message:delete'
export const SEND_REQUEST       = 'send_request'
export const MESSAGE_INFO_REQ   = 'message:info'

// Phase 12.1 typing
export const TYPING_START       = 'typing-start'
export const TYPING_STOP        = 'typing-stop'
export const GROUP_TYPING_START = 'group-typing-start'
export const GROUP_TYPING_STOP  = 'group-typing-stop'

// ── WhatsApp-style status events ──────────────────────────────────────────────
// Individual chat
export const MSG_DELIVERED      = 'message-delivered'   // server → sender: { messageId, roomId, deliveredAt, status }
export const MSG_READ           = 'message-read'        // server → sender: { messageId, roomId, userId, readAt, status }

// Group chat
export const GROUP_MSG_DELIVERED = 'group-message-delivered' // server → sender: { messageId, roomId, userId, deliveredAt, status }
export const GROUP_MSG_READ      = 'group-message-read'      // server → sender: { messageId, roomId, userId, readAt, status }

// Group: client → server (mark this room's messages as read/delivered for me)
export const GROUP_MESSAGE_READ      = 'group-message-read'
export const GROUP_MESSAGE_DELIVERED = 'group-message-delivered'

// Message Info response
export const MESSAGE_INFO_RES   = 'message:info-response'

// ── Inbound (server → client) ─────────────────────────────────────────────────
export const RECEIVE_MESSAGE    = 'receive_message'
export const MESSAGE_SENT       = 'message_sent'
export const MESSAGE_BLOCKED    = 'message_blocked'
export const MESSAGE_EDITED     = 'message:edited'
export const MESSAGE_DELETED    = 'message:deleted'
export const USER_ONLINE        = 'user_online'
export const RECEIVE_REQUEST    = 'receive_request'
export const REQUEST_ACCEPTED   = 'request_accepted'
export const REQUEST_REJECTED   = 'request_rejected'
export const NOTIFICATION_NEW   = 'notification:new'
export const NOTIFICATION_READ_ALL = 'notification:read_all'

// Unread count management
export const UNREAD_INCREMENT   = 'unread_increment'

// Profile updates
export const USER_PROFILE_UPDATED = 'user_profile_updated'

// Group management
export const GROUP_INVITATION          = 'group-invitation'
export const GROUP_INVITATION_ACCEPTED = 'group-invitation-accepted'
export const GROUP_INVITATION_REJECTED = 'group-invitation-rejected'
export const GROUP_MEMBER_REMOVED      = 'group-member-removed'
export const GROUP_DELETED             = 'group-deleted'
export const USER_JOINED_GROUP         = 'user-joined-group'

// Privacy events
export const PRIVACY_UPDATED = 'privacy_updated'

export const CHAT_SETTINGS_UPDATED = 'chatSettingsUpdated'

// client → server: update chat settings via socket (alternative to HTTP PUT)
export const UPDATE_CHAT_SETTINGS  = 'updateChatSettings'

export const CACHE_CLEARED         = 'cacheCleared'

export const MESSAGE_EXPIRED       = 'message:expired'

export const DEVICE_LIST_UPDATED = 'deviceListUpdated'

export const FORCE_LOGOUT        = 'forceLogout'
