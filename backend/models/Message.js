const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content:  { type: String, default: '' },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type:     { type: String, enum: ['text','image','file'], default: 'text' },
  fileUrl:  { type: String, default: null },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);