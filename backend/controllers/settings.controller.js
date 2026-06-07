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
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('settings privacy');
    res.json({ settings: user.settings || {}, privacy: user.privacy || {} });
  } catch (err) { next(err); }
};

// PUT /api/users/me/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { settings: req.body } },
      { new: true, runValidators: false }
    ).select('settings');
    res.json({ settings: user.settings });
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
exports.deleteSession = async (req, res, next) => {
  try {
    await UserSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Session revoked' });
  } catch (err) { next(err); }
};

// DELETE /api/users/me/sessions (all)
exports.deleteAllSessions = async (req, res, next) => {
  try {
    await UserSession.deleteMany({ userId: req.user._id });
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
    await UserSession.deleteMany({ userId: req.user._id });

    const ip = req.ip || req.connection?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    await SecurityLog.create({
      userId: req.user._id, action: 'logout', detail: 'Logged out all devices', ip, device: parseUA(ua)
    });

    res.json({ message: 'Logged out from all devices' });
  } catch (err) { next(err); }
};