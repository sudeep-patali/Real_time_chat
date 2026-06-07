const User         = require('../models/User');
const UserSession  = require('../models/UserSession');
const RefreshToken = require('../models/RefreshToken');
const { body, validationResult } = require('express-validator');
const jwt          = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../config/tokens');
const { logAudit } = require('../utils/audit');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseUA(ua = '') {
  let browser = 'Unknown Browser';
  let os      = 'Unknown OS';
  if (/Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua))                             browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua))        browser = 'Safari';
  else if (/Edge/.test(ua))                                browser = 'Edge';
  if (/Windows/.test(ua))          os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua))       os = 'Linux';
  else if (/Android/.test(ua))     os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  return `${browser} on ${os}`;
}

/** Parse JWT_REFRESH_EXPIRE (e.g. "7d", "24h") into a future Date. */
function refreshExpireDate() {
  const raw = process.env.JWT_REFRESH_EXPIRE || '7d';
  const unit = raw.slice(-1);
  const val  = parseInt(raw, 10);
  const ms   = unit === 'd' ? val * 86400000
             : unit === 'h' ? val * 3600000
             : unit === 'm' ? val * 60000
             : 7 * 86400000;
  return new Date(Date.now() + ms);
}

/** Set the refresh-token httpOnly cookie. */
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    expires:  refreshExpireDate(),
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user         = await User.create({ name, email, password });
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await RefreshToken.create({
      token:     refreshToken,
      userId:    user._id,
      expiresAt: refreshExpireDate(),
    });

    setRefreshCookie(res, refreshToken);

    const ip     = req.ip || req.connection?.remoteAddress || '';
    const device = parseUA(req.headers['user-agent'] || '');
    await logAudit(user._id, 'signup', { ip, device, severity: 'info' });

    res.status(201).json({
      user:  { id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role },
      token: accessToken,
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const ip     = req.ip || req.connection?.remoteAddress || '';
    const ua     = req.headers['user-agent'] || '';
    const device = parseUA(ua);

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      // Log failed attempt; do NOT reveal which field was wrong
      if (user) {
        await logAudit(user._id, 'failed_login', { ip, device, severity: 'warn' });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await RefreshToken.create({
      token:     refreshToken,
      userId:    user._id,
      expiresAt: refreshExpireDate(),
    });

    setRefreshCookie(res, refreshToken);

    // Track session and audit
    try {
      await UserSession.create({ userId: user._id, token: accessToken, device, ip, userAgent: ua });
      await logAudit(user._id, 'login', { ip, device, severity: 'info' });
    } catch (_) { /* non-fatal */ }

    res.json({
      user:  { id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role },
      token: accessToken,
    });
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' });

    if (req.user) {
      const ip     = req.ip || req.connection?.remoteAddress || '';
      const device = parseUA(req.headers['user-agent'] || '');
      await logAudit(req.user._id, 'logout', { ip, device, severity: 'info' });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    // Verify signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check DB record
    const stored = await RefreshToken.findOne({ token });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired or revoked' });
    }

    // Rotate: revoke old, create new
    stored.revoked = true;
    await stored.save();

    const newRefresh = generateRefreshToken(decoded.id);
    await RefreshToken.create({
      token:     newRefresh,
      userId:    decoded.id,
      expiresAt: refreshExpireDate(),
    });

    const newAccess = generateAccessToken(decoded.id);
    setRefreshCookie(res, newRefresh);

    await logAudit(decoded.id, 'token_refreshed', {
      ip:       req.ip || '',
      device:   parseUA(req.headers['user-agent'] || ''),
      severity: 'info',
    });

    res.json({ token: newAccess });
  } catch (err) { next(err); }
};