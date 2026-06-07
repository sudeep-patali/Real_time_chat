const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content:      { type: String, default: '' },
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type:         { type: String, enum: ['text','image','video','file','document','audio','gif'], default: 'text' },
  fileUrl:      { type: String, default: null },
  fileName:     { type: String, default: null },
  mimeType:     { type: String, default: null },
  fileDuration: { type: Number, default: null },   // seconds — for audio/video messages
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Edit
  isEdited:  { type: Boolean, default: false },
  editedAt:  { type: Date, default: null },

  // Delete
  isDeleted:  { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);