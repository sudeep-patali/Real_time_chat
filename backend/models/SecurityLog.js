const mongoose = require('mongoose');

const ACTIONS = [
  // Existing
  'password_changed', 'login', 'logout', 'new_device', '2fa_enabled',
  // New
  'signup',
  'message_sent', 'room_created', 'room_deleted',
  'member_added', 'member_removed',
  'key_rotated', 'token_refreshed', 'token_revoked',
  'failed_login', 'rate_limit_hit',
];

const securityLogSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  action: {
    type:     String,
    enum:     ACTIONS,
    required: true,
  },
  severity: {
    type:    String,
    enum:    ['info', 'warn', 'critical'],
    default: 'info',
  },
  detail: { type: String, default: '' },
  ip:     { type: String, default: '' },
  device: { type: String, default: '' },
  // Arbitrary structured context — never store plaintext message content here.
  meta:   { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);