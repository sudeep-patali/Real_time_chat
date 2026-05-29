const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup:        { type: Boolean, default: false },
  groupName:      { type: String, default: null },
  avatarUrl:      { type: String, default: null },
  description:    { type: String, default: '' },
  lastMessage:    { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);