const mongoose = require('mongoose');

// ── Per-member status sub-document (for groups) ──────────────────────────────
const memberStatusSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  content:      { type: String, default: '' }, // Base64 ciphertext when encrypted=true
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type:         { type: String, enum: ['text','image','video','file','document','audio','gif'], default: 'text' },
  fileUrl:      { type: String, default: null },
  fileName:     { type: String, default: null },
  mimeType:     { type: String, default: null },
  fileDuration: { type: Number, default: null },

  // ── E2E Encryption fields (AES-256-GCM) ──────────────────────────────────
  // All values are Base64-encoded.
  iv:        { type: String, default: null },   // 12-byte GCM nonce
  authTag:   { type: String, default: null },   // 16-byte GCM authentication tag
  encrypted: { type: Boolean, default: false }, // true → content is ciphertext

  // ── WhatsApp-style status tracking ──────────────────────────────────────
  sentAt:      { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },

  // Group chats: per-member delivery + read arrays
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Rich per-member status for Message Info panel
  memberStatuses: [memberStatusSchema],

  // Edit
  isEdited:  { type: Boolean, default: false },
  editedAt:  { type: Date,    default: null },

  // Delete
  isDeleted:  { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Reply
  replyTo: {
    id:         { type: String, default: null },
    content:    { type: String, default: null },
    senderName: { type: String, default: null },
  },

}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);