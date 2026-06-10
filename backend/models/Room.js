const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup:        { type: Boolean, default: false },
  groupName:      { type: String, default: null },
  avatarUrl:      { type: String, default: null },
  description:    { type: String, default: '' },
  lastMessage:    { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminIds:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Message Request System
  status:      {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'accepted'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

roomSchema.index({ participantIds: 1 });
roomSchema.index({ status: 1 });

module.exports = mongoose.model('Room', roomSchema);