const mongoose = require('mongoose');

// ── Per-member status sub-document (for groups) ──────────────────────────────
const memberStatusSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  content:      { type: String, default: '' },
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type:         { type: String, enum: ['text','image','video','file','document','audio','gif'], default: 'text' },
  fileUrl:      { type: String, default: null },
  fileName:     { type: String, default: null },
  mimeType:     { type: String, default: null },
  fileDuration: { type: Number, default: null },

  // ── WhatsApp-style status tracking ──────────────────────────────────────
  // sentAt is effectively createdAt; kept explicit for message-info display
  sentAt:      { type: Date, default: null },

  // Individual chat: set when receiver's socket connects / opens app
  deliveredAt: { type: Date, default: null },
  // Individual chat: set when receiver opens the room
  readAt:      { type: Date, default: null },

  // Group chats: per-member delivery + read arrays
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Rich per-member status for Message Info panel
  memberStatuses: [memberStatusSchema],

  // Edit
  isEdited:  { type: Boolean, default: false },
  editedAt:  { type: Date, default: null },

  // Delete
  isDeleted:  { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);