const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:      { type: String, required: true },
  device:     { type: String, default: 'Unknown' },
  ip:         { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
  createdAt:  { type: Date, default: Date.now },

  deviceId:  { type: String, default: '' },

  browser:   { type: String, default: 'Unknown' },
  os:        { type: String, default: 'Unknown' },

  isActive:  { type: Boolean, default: true },

  sessionId: { type: String, default: '' },
}, { timestamps: false });


userSessionSchema.index({ userId: 1, deviceId: 1 });
userSessionSchema.index({ userId: 1, token: 1 });

module.exports = mongoose.model('UserSession', userSessionSchema);
