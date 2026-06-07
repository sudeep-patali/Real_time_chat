// Outbound (client → server)
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

// Phase 12.1 typing
export const TYPING_START       = 'typing-start'
export const TYPING_STOP        = 'typing-stop'
export const GROUP_TYPING_START = 'group-typing-start'
export const GROUP_TYPING_STOP  = 'group-typing-stop'

// Inbound (server → client)
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
// Server emits UNREAD_INCREMENT to recipient(s) when a new message arrives.
// Client resets via clearUnread() when the chat is opened.
export const UNREAD_INCREMENT   = 'unread_increment'

// Group management
export const GROUP_INVITATION          = 'group-invitation'
export const GROUP_INVITATION_ACCEPTED = 'group-invitation-accepted'
export const GROUP_INVITATION_REJECTED = 'group-invitation-rejected'
export const GROUP_MEMBER_REMOVED      = 'group-member-removed'
export const GROUP_DELETED             = 'group-deleted'
export const USER_JOINED_GROUP         = 'user-joined-group'