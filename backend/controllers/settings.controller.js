const User        = require('../models/User');
const Message     = require('../models/Message');
const UserSession = require('../models/UserSession');
const SecurityLog = require('../models/SecurityLog');

// ── Helper: parse user-agent to human-readable device string ─────────────
function parseUA(ua = '') {
  let browser = 'Unknown Browser';
  let os      = 'Unknown OS';

  if (/Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edge/.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/.test(ua)) browser = 'Opera';

  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  return `${browser} on ${os}`;
}

// GET /api/users/me/settings
// FIX: Also returns privacy fields (lastSeen, onlineStatus, readReceipts, typingIndicator,
// addToGroups) from the root-level user.privacy so the frontend PrivacySection can
// correctly populate its form from a single API call.
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('settings privacy');

    // Merge privacy fields that live on user.privacy into settings.privacy
    // so the frontend store has a single unified settings object.
    const settingsObj = user.settings ? user.settings.toObject() : {};
    settingsObj.privacy = {
      // Fields managed via settings.privacy (readReceipts, typingIndicator)
      readReceipts:    user.privacy?.readReceipts    ?? true,
      typingIndicator: user.privacy?.typingIndicator ?? true,
      // Visibility fields managed via user.privacy (lastSeen, onlineStatus, addToGroups)
      lastSeen:        user.privacy?.lastSeen        ?? 'everyone',
      onlineStatus:    user.privacy?.onlineStatus    ?? 'everyone',
      addToGroups:     user.privacy?.addToGroups     ?? 'everyone',
    };

    res.json({ settings: settingsObj, privacy: user.privacy || {} });
  } catch (err) { next(err); }
};

// PUT /api/users/me/settings
// FIX: Use dot-notation $set for each leaf field instead of replacing the
// whole `settings` subdocument. This prevents a partial payload from wiping
// fields the client didn't send (e.g. saving notifications shouldn't clear
// accessibility settings).
//
// Phase 1: After a successful save, emits 'chatSettingsUpdated' to the
// user's personal Socket.IO room so all other open tabs/devices pick up
// the new chat settings in real time without a page refresh.
exports.updateSettings = async (req, res, next) => {
  try {
    const body = req.body;

    // Build a flat dot-notation update so we do surgical field-level writes.
    const setObj = {};
    const flattenSection = (section, data) => {
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
          setObj[`settings.${section}.${k}`] = v;
        });
      }
    };

    // Only process known sections to avoid injecting arbitrary keys.
    const knownSections = ['notifications', 'privacy', 'chat', 'groups', 'twoFactor', 'accessibility'];
    knownSections.forEach(section => {
      if (body[section] !== undefined) flattenSection(section, body[section]);
    });

    // If nothing valid was sent, bail early.
    if (Object.keys(setObj).length === 0) {
      const user = await User.findById(req.user._id).select('settings');
      return res.json({ settings: user.settings });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setObj },
      { new: true, runValidators: false }
    ).select('settings privacy');

    // Return the same enriched shape as getSettings so the frontend store
    // always gets privacy.lastSeen/onlineStatus even after a save.
    const settingsObj = user.settings ? user.settings.toObject() : {};
    settingsObj.privacy = {
      readReceipts:    user.privacy?.readReceipts    ?? true,
      typingIndicator: user.privacy?.typingIndicator ?? true,
      lastSeen:        user.privacy?.lastSeen        ?? 'everyone',
      onlineStatus:    user.privacy?.onlineStatus    ?? 'everyone',
      addToGroups:     user.privacy?.addToGroups     ?? 'everyone',
    };

    // Emit privacy_updated if any privacy section was changed so all connected
    // clients can re-apply the new rules for this user in real time.
    const hasPrivacyChange = body.privacy && typeof body.privacy === 'object'
      && Object.keys(body.privacy).length > 0;
    if (hasPrivacyChange) {
      const io = req.app.get('io');
      if (io) {
        io.emit('privacy_updated', {
          userId:  req.user._id.toString(),
          privacy: settingsObj.privacy,
        });
      }
    }

    // Phase 1: emit chatSettingsUpdated to the user's personal room so all
    // other open tabs and devices update their chat settings in real time.
    const hasChatChange = body.chat && typeof body.chat === 'object'
      && Object.keys(body.chat).length > 0;
    if (hasChatChange) {
      const io = req.io || req.app.get('io');
      if (io) {
        io.to(req.user._id.toString()).emit('chatSettingsUpdated', {
          chat: settingsObj.chat,
        });
      }
    }

    // Phase 3: emit accessibilitySettingsUpdated to the user's personal room so
    // all other open tabs and devices update their accessibility settings
    // (high contrast, keyboard shortcuts, screen reader) in real time.
    const hasAccessibilityChange = body.accessibility && typeof body.accessibility === 'object'
      && Object.keys(body.accessibility).length > 0;
    if (hasAccessibilityChange) {
      const io = req.app.get('io');
      if (io) {
        io.to(req.user._id.toString()).emit('accessibilitySettingsUpdated', {
          accessibility: settingsObj.accessibility,
        });
      }
    }

    res.json({ settings: settingsObj });
  } catch (err) { next(err); }
};

// POST /api/users/me/clear-cache
// Phase 1: No DB change needed — the cache is entirely client-side.
// Emits 'cacheCleared' to the user's personal Socket.IO room so any other
// open tabs of the same user also clear their localStorage in response.
exports.clearCache = async (req, res, next) => {
  try {
    const io = req.io || req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('cacheCleared', {});
    }
    res.json({ message: 'Cache cleared' });
  } catch (err) { next(err); }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const match = await user.matchPassword(currentPassword);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    const ip = req.ip || req.connection?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    await SecurityLog.create({
      userId: user._id, action: 'password_changed', ip, device: parseUA(ua)
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

// POST /api/auth/forgot-password (stub)
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    console.log(`[Forgot Password] OTP would be sent to: ${email}, user found: ${!!user}`);
    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) { next(err); }
};

// POST /api/auth/verify-otp (stub)
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    console.log(`[Verify OTP] email=${email}, otp=${otp}`);
    // Stub: accept any 6-digit OTP
    if (otp && otp.length === 6) {
      res.json({ message: 'OTP verified successfully', verified: true });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (err) { next(err); }
};

// DELETE /api/users/me — delete account
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });

    const user = await User.findById(req.user._id);
    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: 'Incorrect password' });

    // Clean up sessions and logs
    await UserSession.deleteMany({ userId: user._id });
    await SecurityLog.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) { next(err); }
};

// GET /api/users/me/export — export chat history as JSON
exports.exportChatHistory = async (req, res, next) => {
  try {
    const messages = await Message.find({ senderId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const json = JSON.stringify({ exportedAt: new Date(), messages }, null, 2);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="chat-history.json"',
    });
    res.send(json);
  } catch (err) { next(err); }
};

// GET /api/users/me/data — download all user data
exports.downloadMyData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    const messageCount = await Message.countDocuments({ senderId: req.user._id });
    const sessions = await UserSession.find({ userId: req.user._id }).lean();
    const logs = await SecurityLog.find({ userId: req.user._id }).lean();

    const payload = {
      exportedAt: new Date(),
      profile: user,
      stats: { messageCount },
      activeSessions: sessions.length,
      securityLogs: logs,
    };

    const json = JSON.stringify(payload, null, 2);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-data.json"',
    });
    res.send(json);
  } catch (err) { next(err); }
};

// GET /api/users/me/sessions
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await UserSession.find({ userId: req.user._id })
      .sort({ lastActive: -1 });
    res.json({ sessions });
  } catch (err) { next(err); }
};

// DELETE /api/users/me/sessions/:id
//
// Phase 2: After deleting the DB record, emits two socket events to the
// user's personal room:
//   • 'deviceListUpdated' — all tabs reload the device list (real-time UI sync)
//   • 'forceLogout'       — the specific tab/device that owns this session
//     detects its own sessionId and immediately clears auth state + redirects
//     to /login.
exports.deleteSession = async (req, res, next) => {
  try {
    const io = req.io || req.app.get('io');
    const userId = req.user._id.toString();

    // Fetch the session first so we have the sessionId to send in the event
    const session = await UserSession.findOne({ _id: req.params.id, userId: req.user._id });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const { sessionId } = session;

    await UserSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (io) {
      // Tell all tabs to refresh the device list
      io.to(userId).emit('deviceListUpdated', {});

      // Tell the specific session to force-logout.
      // The client matches on sessionId (stored in sessionStorage after login).
      io.to(userId).emit('forceLogout', {
        targetAll: false,
        sessionId,
      });
    }

    res.json({ message: 'Session revoked' });
  } catch (err) { next(err); }
};

// DELETE /api/users/me/sessions/:id/force
//
// Phase 2: Explicit force-logout endpoint.  Logic is identical to deleteSession
// but lives on a dedicated route to make the intent unambiguous.
exports.logoutDevice = async (req, res, next) => {
  try {
    const io = req.io || req.app.get('io');
    const userId = req.user._id.toString();

    const session = await UserSession.findOne({ _id: req.params.id, userId: req.user._id });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const { sessionId } = session;

    await UserSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (io) {
      io.to(userId).emit('deviceListUpdated', {});
      io.to(userId).emit('forceLogout', {
        targetAll: false,
        sessionId,
      });
    }

    res.json({ message: 'Device logged out' });
  } catch (err) { next(err); }
};

// DELETE /api/users/me/sessions (all)
//
// Phase 2: After deleting all sessions, emits 'forceLogout' with targetAll: true
// so every open tab — including the one that clicked the button — is
// immediately redirected to /login.
exports.deleteAllSessions = async (req, res, next) => {
  try {
    const io = req.io || req.app.get('io');
    const userId = req.user._id.toString();

    await UserSession.deleteMany({ userId: req.user._id });

    if (io) {
      io.to(userId).emit('forceLogout', { targetAll: true });
    }

    res.json({ message: 'All sessions revoked' });
  } catch (err) { next(err); }
};

// GET /api/users/me/security-logs
exports.getSecurityLogs = async (req, res, next) => {
  try {
    const logs = await SecurityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ logs });
  } catch (err) { next(err); }
};

// DELETE /api/auth/sessions — logout all devices
exports.logoutAllDevices = async (req, res, next) => {
  try {
    const io = req.io || req.app.get('io');
    const userId = req.user._id.toString();

    await UserSession.deleteMany({ userId: req.user._id });

    const ip = req.ip || req.connection?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    await SecurityLog.create({
      userId: req.user._id, action: 'logout', detail: 'Logged out all devices', ip, device: parseUA(ua)
    });

    if (io) {
      io.to(userId).emit('forceLogout', { targetAll: true });
    }

    res.json({ message: 'Logged out from all devices' });
  } catch (err) { next(err); }
};