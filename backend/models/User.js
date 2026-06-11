const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },

  // password is optional for Google-only accounts
  password:     { type: String, default: null, minlength: 6 },

  avatar:       { type: String, default: null },
  bio:          { type: String, default: '' },
  username:     { type: String, default: '', trim: true },
  role:         { type: String, enum: ['admin','member'], default: 'member' },
  isOnline:     { type: Boolean, default: false },
  lastSeen:     { type: Date, default: Date.now },

  // ── Email verification ──────────────────────────────────────────────────
  // true once the user's email has been confirmed via OTP (or via Google OAuth,
  // where the email is already verified by Google).
  emailVerified: { type: Boolean, default: false },

  // ── Google OAuth ────────────────────────────────────────────────────────
  // Populated when the account was created or linked via Google Sign-In.
  // null for email/password accounts.
  googleId:     { type: String, default: null, sparse: true },

  // RSA public key (PEM) for E2E encryption.
  // The private key is stored only in the user's browser (IndexedDB) and never sent to the server.
  publicKey:    { type: String, default: null },

  // Status
  statusValue:  { type: String, default: 'available' },
  customStatus: { type: String, default: '' },

  // Privacy settings
  privacy: {
    profilePhoto:    { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    lastSeen:        { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    onlineStatus:    { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    addToGroups:     { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    messages:        { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    readReceipts:    { type: Boolean, default: true },
    typingIndicator: { type: Boolean, default: true },
  },

  // Statistics counters
  stats: {
    messagesSent: { type: Number, default: 0 },
    filesShared:  { type: Number, default: 0 },
    mediaShared:  { type: Number, default: 0 },
  },

  settings: {
    notifications: {
      enabled:        { type: Boolean, default: true },
      sound:          { type: Boolean, default: true },
      browser:        { type: Boolean, default: false },
      groupEnabled:   { type: Boolean, default: true },
      mentionEnabled: { type: Boolean, default: true },
      messageSound:   { type: String, default: 'default' },
      groupSound:     { type: String, default: 'default' },
    },
    privacy: {
      readReceipts:    { type: Boolean, default: true },
      typingIndicator: { type: Boolean, default: true },
    },
    chat: {
      autoDeleteMessages:  { type: String, default: 'off' },
      autoDownloadImages:  { type: Boolean, default: true },
      autoDownloadVideos:  { type: Boolean, default: false },
      autoDownloadDocs:    { type: Boolean, default: false },
    },
    groups: {
      muteAll:       { type: Boolean, default: false },
      mentionNotifs: { type: Boolean, default: true },
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      method:  { type: String, enum: ['email', 'authenticator'], default: 'email' },
    },
    accessibility: {
      highContrast:      { type: Boolean, default: false },
      keyboardShortcuts: { type: Boolean, default: true },
      screenReader:      { type: Boolean, default: false },
    },
    appearance: {
      fontSize:    { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      bubbleSize:  { type: String, enum: ['compact', 'normal', 'large'], default: 'normal' },
      compactMode: { type: Boolean, default: false },
    },
  },

  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedUsers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedRooms:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room'  }],

}, { timestamps: true });

// Hash password before saving (skip if not modified or null/google account)
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function(entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);