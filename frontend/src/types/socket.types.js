/**
 * @typedef {Object} SendMessagePayload
 * @property {string} content
 * @property {string} roomId
 * @property {'text'|'image'|'file'} type
 *
 * @typedef {Object} ReceiveMessagePayload
 * @property {import('./message.types').Message} message
 *
 * @typedef {Object} UserTypingPayload
 * @property {string} userId
 * @property {string} roomId
 * @property {boolean} isTyping
 *
 * @typedef {Object} UserOnlinePayload
 * @property {string} userId
 * @property {boolean} isOnline
 */