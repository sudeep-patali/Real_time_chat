/**
 * auth.controller.js
 *
 * Exports:
 *   sendSignupOtp     POST /auth/signup/send-otp
 *   verifySignupOtp   POST /auth/signup/verify-otp
 *   resendSignupOtp   POST /auth/signup/resend-otp
 *   googleAuth        POST /auth/google
 *   login             POST /auth/login
 *   logout            POST /auth/logout
 *   refreshToken      POST /auth/refresh
 */

const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User              = require('../models/User');
const OtpVerification   = require('../models/OtpVerification');
const UserSession       = require('../models/UserSession');
const RefreshToken      = require('../models/RefreshToken');

const { body, validationResult } = require('express-validator');
const { generateAccessToken, generateRefreshToken } = require('../config/tokens');
const { logAudit }  = require('../utils/audit');
const { sendOtpEmail } = require('../utils/email');

// ── Constants ─────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MINS   = 10;                          // OTP valid for 10 minutes
const OTP_MAX_ATTEMPTS  = 5;                           // max failed verifications
const OTP_RESEND_COOLDOWN_SECS = 60;                   // min seconds between resends
const OTP_MAX_RESENDS   = 5;                           // max resends per session
const GOOGLE_CLIENT_ID  = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseUA(ua = '') {
  let browser = 'Unknown Browser', os = 'Unknown OS';
  if (/Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua))                             browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua))        browser = 'Safari';
  else if (/Edge/.test(ua))                                browser = 'Edge';
  if (/Windows/.test(ua))               os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua))            os = 'Linux';
  else if (/Android/.test(ua))          os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  return `${browser} on ${os}`;
}

function refreshExpireDate() {
  const raw  = process.env.JWT_REFRESH_EXPIRE || '7d';
  const unit = raw.slice(-1);
  const val  = parseInt(raw, 10);
  const ms   = unit === 'd' ? val * 86400000
             : unit === 'h' ? val * 3600000
             : unit === 'm' ? val * 60000
             : 7 * 86400000;
  return new Date(Date.now() + ms);
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    expires:  refreshExpireDate(),
  });
}

/** Generate a cryptographically secure 6-digit OTP string */
function generateOtp() {
  // Use crypto.randomInt for uniform distribution with no modulo bias
  return String(crypto.randomInt(100000, 999999));
}

/** Issue tokens, create DB record, set cookie, return { user, token } */
async function issueSession(res, user, req) {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await RefreshToken.create({
    token:     refreshToken,
    userId:    user._id,
    expiresAt: refreshExpireDate(),
  });

  setRefreshCookie(res, refreshToken);

  const ip     = req.ip || req.connection?.remoteAddress || '';
  const ua     = req.headers['user-agent'] || '';
  const device = parseUA(ua);

  try {
    await UserSession.create({ userId: user._id, token: accessToken, device, ip, userAgent: ua });
    await logAudit(user._id, 'login', { ip, device, severity: 'info' });
  } catch (_) { /* non-fatal */ }

  return {
    user:  { id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, username: user.username },
    token: accessToken,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * Step 1 of email signup:  validate form data, hash password, generate OTP,
 * persist a pending record, and send the OTP email.
 *
 * POST /api/auth/signup/send-otp
 * Body: { name, email, password }
 */
exports.sendSignupOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    // Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate OTP
    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 12);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);

    // Upsert: replace any existing pending verification for this email
    await OtpVerification.findOneAndDelete({ email: email.toLowerCase() });
    await OtpVerification.create({
      email:        email.toLowerCase(),
      name:         name.trim(),
      passwordHash,
      otpHash,
      expiresAt,
      attempts:     0,
      resendCount:  0,
      lastResendAt: null,
    });

    // Send OTP email (non-blocking on failure to avoid leaking email existence)
    try {
      await sendOtpEmail(email, name.trim(), otp, OTP_EXPIRY_MINS);
    } catch (mailErr) {
      console.error('[OTP] Email send failed:', mailErr.message);
      // Rollback the pending record so the user can retry
      await OtpVerification.findOneAndDelete({ email: email.toLowerCase() });
      return res.status(502).json({ message: 'Failed to send verification email. Please try again.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || '';
    await logAudit(null, 'otp_sent', { ip, email, severity: 'info' }).catch(() => {});

    res.status(200).json({
      message:    'Verification code sent to your email.',
      expiryMins: OTP_EXPIRY_MINS,
    });
  } catch (err) { next(err); }
};

/**
 * Step 2 of email signup: verify OTP and create the user account.
 *
 * POST /api/auth/signup/verify-otp
 * Body: { email, otp }
 */
exports.verifySignupOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, otp } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || '';

    const pending = await OtpVerification.findOne({ email: email.toLowerCase() });

    if (!pending) {
      return res.status(400).json({ message: 'No pending verification found. Please start signup again.' });
    }

    // Check expiry
    if (pending.expiresAt < new Date()) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(400).json({ message: 'Verification code has expired. Please start signup again.' });
    }

    // Check attempt limit
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(429).json({ message: 'Too many incorrect attempts. Please start signup again.' });
    }

    // Verify OTP
    const isMatch = await pending.matchOtp(otp.trim());
    if (!isMatch) {
      pending.attempts += 1;
      await pending.save();

      const remaining = OTP_MAX_ATTEMPTS - pending.attempts;
      if (remaining <= 0) {
        await OtpVerification.findByIdAndDelete(pending._id);
        return res.status(400).json({ message: 'Invalid code. Too many attempts — please start signup again.' });
      }
      return res.status(400).json({
        message:   `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        remaining,
      });
    }

    // OTP correct — double-check email isn't registered (race condition guard)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Create user account with pre-hashed password
    // We bypass the pre-save hook by setting password directly to the hash.
    // To do this cleanly we set a flag via a virtual so the hook can skip it.
    const user = new User({
      name:          pending.name,
      email:         pending.email,
      password:      '__SKIP_HASH__',   // placeholder — overwritten below
      emailVerified: true,
    });
    // Directly assign the already-hashed password without triggering the hook
    user.$locals.skipPasswordHash = true;
    await User.collection.insertOne({
      name:          pending.name,
      email:         pending.email,
      password:      pending.passwordHash,
      emailVerified: true,
      avatar:        null,
      bio:           '',
      username:      '',
      role:          'member',
      isOnline:      false,
      lastSeen:      new Date(),
      googleId:      null,
      publicKey:     null,
      statusValue:   'available',
      customStatus:  '',
      privacy:       { profilePhoto: 'everyone', lastSeen: 'everyone', onlineStatus: 'everyone', addToGroups: 'everyone', messages: 'everyone', readReceipts: true, typingIndicator: true },
      stats:         { messagesSent: 0, filesShared: 0, mediaShared: 0 },
      settings:      {},
      blockedUsers:  [],
      mutedUsers:    [],
      mutedRooms:    [],
      createdAt:     new Date(),
      updatedAt:     new Date(),
    });

    const createdUser = await User.findOne({ email: pending.email });

    // Clean up OTP record
    await OtpVerification.findByIdAndDelete(pending._id);

    await logAudit(createdUser._id, 'signup', { ip, device: parseUA(req.headers['user-agent'] || ''), severity: 'info' }).catch(() => {});

    const session = await issueSession(res, createdUser, req);

    res.status(201).json({
      ...session,
      message: 'Account created successfully!',
    });
  } catch (err) { next(err); }
};

/**
 * Resend OTP (with cooldown and max resend limits).
 *
 * POST /api/auth/signup/resend-otp
 * Body: { email }
 */
exports.resendSignupOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const pending = await OtpVerification.findOne({ email: email.toLowerCase() });

    if (!pending) {
      return res.status(400).json({ message: 'No pending verification found. Please start signup again.' });
    }

    // Check resend limit
    if (pending.resendCount >= OTP_MAX_RESENDS) {
      return res.status(429).json({ message: 'Maximum resend limit reached. Please start signup again.' });
    }

    // Check cooldown
    if (pending.lastResendAt) {
      const secondsSinceLast = (Date.now() - pending.lastResendAt.getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECS) {
        const waitSecs = Math.ceil(OTP_RESEND_COOLDOWN_SECS - secondsSinceLast);
        return res.status(429).json({
          message:  `Please wait ${waitSecs} second${waitSecs !== 1 ? 's' : ''} before requesting a new code.`,
          waitSecs,
        });
      }
    }

    // Generate fresh OTP and reset expiry
    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    pending.otpHash      = otpHash;
    pending.expiresAt    = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);
    pending.attempts     = 0;
    pending.resendCount += 1;
    pending.lastResendAt = new Date();
    await pending.save();

    try {
      await sendOtpEmail(email, pending.name, otp, OTP_EXPIRY_MINS);
    } catch (mailErr) {
      console.error('[OTP] Resend email failed:', mailErr.message);
      return res.status(502).json({ message: 'Failed to resend verification email. Please try again.' });
    }

    res.status(200).json({
      message:    'A new verification code has been sent to your email.',
      expiryMins: OTP_EXPIRY_MINS,
      cooldownSecs: OTP_RESEND_COOLDOWN_SECS,
    });
  } catch (err) { next(err); }
};

/**
 * Google Sign-In / Sign-Up.
 * Accepts a Google ID token, verifies it server-side, then either logs in
 * an existing user or creates a new one.
 *
 * POST /api/auth/google
 * Body: { idToken }
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google ID token is required.' });

    // Verify the token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error('[Google Auth] Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid Google token. Please try again.' });
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google account email is not verified.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || '';
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
    let isNew = false;

    if (!user) {
      // New user — create account automatically
      user = await User.create({
        name:          name,
        email:         email.toLowerCase(),
        password:      null,
        googleId,
        avatar:        picture || null,
        emailVerified: true,
      });
      isNew = true;
      await logAudit(user._id, 'signup_google', { ip, severity: 'info' }).catch(() => {});
    } else {
      // Existing user — link Google ID if not already linked
      if (!user.googleId) {
        user.googleId      = googleId;
        user.emailVerified = true;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    }

    const session = await issueSession(res, user, req);

    res.status(isNew ? 201 : 200).json({
      ...session,
      isNewUser: isNew,
      message:   isNew ? 'Account created with Google!' : 'Logged in with Google!',
    });
  } catch (err) { next(err); }
};

/**
 * Email + password login.
 *
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const ip     = req.ip || req.connection?.remoteAddress || '';
    const device = parseUA(req.headers['user-agent'] || '');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      if (user) await logAudit(user._id, 'failed_login', { ip, device, severity: 'warn' }).catch(() => {});
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Google-only accounts cannot log in with a password
    if (!user.password && user.googleId) {
      return res.status(400).json({ message: 'This account uses Google Sign-In. Please continue with Google.' });
    }

    const session = await issueSession(res, user, req);
    res.json(session);
  } catch (err) { next(err); }
};

/**
 * Logout — revoke refresh token.
 *
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await RefreshToken.findOneAndUpdate({ token }, { revoked: true });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    if (req.user) {
      const ip = req.ip || req.connection?.remoteAddress || '';
      await logAudit(req.user._id, 'logout', { ip, device: parseUA(req.headers['user-agent'] || ''), severity: 'info' }).catch(() => {});
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

/**
 * Rotate refresh token and issue a new access token.
 *
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const stored = await RefreshToken.findOne({ token });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired or revoked' });
    }

    // Rotate
    stored.revoked = true;
    await stored.save();

    const newRefresh = generateRefreshToken(decoded.id);
    await RefreshToken.create({ token: newRefresh, userId: decoded.id, expiresAt: refreshExpireDate() });

    const newAccess = generateAccessToken(decoded.id);
    setRefreshCookie(res, newRefresh);

    await logAudit(decoded.id, 'token_refreshed', {
      ip:       req.ip || '',
      device:   parseUA(req.headers['user-agent'] || ''),
      severity: 'info',
    }).catch(() => {});

    res.json({ token: newAccess });
  } catch (err) { next(err); }
};