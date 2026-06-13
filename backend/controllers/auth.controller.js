/**
 * auth.controller.js  —  backend/controllers/auth.controller.js
 *
 * Exports:
 *   sendSignupOtp     POST /auth/signup/send-otp
 *   verifySignupOtp   POST /auth/signup/verify-otp
 *   resendSignupOtp   POST /auth/signup/resend-otp
 *   firebaseAuth      POST /auth/firebase          ← replaces /auth/google
 *   login             POST /auth/login
 *   logout            POST /auth/logout
 *   refreshToken      POST /auth/refresh
 *
 * Phase 2 change in issueSession:
 *   • Reads deviceId from req.body and uses it to upsert (deduplicate) the
 *     UserSession record so the same browser/device never accumulates stale rows.
 *   • Populates the new browser, os, isActive, and sessionId fields.
 *   • Falls back to UserSession.create() for clients that don't send deviceId.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');

// ── Firebase Admin Auth (replaces google-auth-library) ──────────────────────
const firebaseAuth = require('../config/firebase');

const User            = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const UserSession     = require('../models/UserSession');
const RefreshToken    = require('../models/RefreshToken');

const { body, validationResult } = require('express-validator');
const { generateAccessToken, generateRefreshToken } = require('../config/tokens');
const { logAudit }    = require('../utils/audit');
const { sendOtpEmail } = require('../utils/email');

// ── Constants ─────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MINS          = 10;
const OTP_MAX_ATTEMPTS         = 5;
const OTP_RESEND_COOLDOWN_SECS = 60;
const OTP_MAX_RESENDS          = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * parseUA — returns a human-readable string like "Chrome on Windows".
 * Kept for audit log compatibility (existing callers pass the result directly).
 */
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

/**
 * parseBrowserOS — returns { browser, os } as separate strings.
 * Used by issueSession to populate the new UserSession fields.
 */
function parseBrowserOS(ua = '') {
  let browser = 'Unknown', os = 'Unknown';
  if (/Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua))                             browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua))        browser = 'Safari';
  else if (/Edge/.test(ua))                                browser = 'Edge';
  else if (/OPR|Opera/.test(ua))                           browser = 'Opera';
  if (/Windows/.test(ua))               os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua))            os = 'Linux';
  else if (/Android/.test(ua))          os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  return { browser, os };
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

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

// ── issueSession ──────────────────────────────────────────────────────────────
//
// Phase 2: reads deviceId from req.body.  When present:
//   • findOneAndUpdate with { upsert: true } keeps exactly one UserSession row
//     per (userId, deviceId) pair — no duplicate entries accumulate on repeat
//     logins from the same browser/device.
//   • A fresh sessionId is generated each time so the client can match
//     incoming forceLogout socket events to itself.
// When deviceId is absent (older clients / server-side calls):
//   • Falls back to UserSession.create() — existing behaviour unchanged.
//
async function issueSession(res, user, req) {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Ensure we have full user data (callers may pass a partial document)
  const fullUser = await User.findById(user._id)
    .select('name email avatar role username bio statusValue customStatus isOnline lastSeen createdAt privacy');

  await RefreshToken.create({
    token:     refreshToken,
    userId:    user._id,
    expiresAt: refreshExpireDate(),
  });

  setRefreshCookie(res, refreshToken);

  const ip       = req.ip || req.connection?.remoteAddress || '';
  const ua       = req.headers['user-agent'] || '';
  const device   = parseUA(ua);                     // "Chrome on Windows"
  const { browser, os } = parseBrowserOS(ua);       // separate fields for UI
  const sessionId = crypto.randomBytes(16).toString('hex');

  // Read the stable device fingerprint sent by the frontend (generated from
  // UA + screen dimensions + locale in sessionStorage).
  const deviceId = req.body?.deviceId || '';

  try {
    if (deviceId) {
      // ── Deduplicated upsert ─────────────────────────────────────────────
      // If this (userId, deviceId) pair already has a row, update it in place
      // (refreshing the token, IP, lastActive, etc.) so the list stays clean.
      // If no row exists yet, setDefaultsOnInsert creates one.
      await UserSession.findOneAndUpdate(
        { userId: user._id, deviceId },
        {
          token:      accessToken,
          device,
          ip,
          userAgent:  ua,
          lastActive: new Date(),
          isActive:   true,
          browser,
          os,
          sessionId,
          createdAt:  new Date(),   // only meaningful on insert; harmless on update
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      // ── Legacy path: no deviceId provided ──────────────────────────────
      await UserSession.create({
        userId:    user._id,
        token:     accessToken,
        device,
        ip,
        userAgent: ua,
        lastActive: new Date(),
        isActive:   true,
        browser,
        os,
        sessionId,
      });
    }

    await logAudit(user._id, 'login', { ip, device, severity: 'info' });
  } catch (_) { /* non-fatal */ }

  // Mark the user online and refresh lastSeen on every fresh login
  await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

  return {
    user: {
      id:           fullUser._id,
      name:         fullUser.name,
      email:        fullUser.email,
      avatar:       fullUser.avatar,
      role:         fullUser.role,
      username:     fullUser.username,
      bio:          fullUser.bio          || '',
      statusValue:  fullUser.statusValue  || 'available',
      customStatus: fullUser.customStatus || '',
      isOnline:     true,
      lastSeen:     fullUser.lastSeen,
      createdAt:    fullUser.createdAt,
      privacy:      fullUser.privacy || {},
    },
    token: accessToken,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

exports.sendSignupOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp          = generateOtp();
    const otpHash      = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 12);
    const expiresAt    = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);

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

    try {
      await sendOtpEmail(email, name.trim(), otp, OTP_EXPIRY_MINS);
    } catch (mailErr) {
      console.error('[OTP] Email send failed:', mailErr.message);
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

    if (pending.expiresAt < new Date()) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(400).json({ message: 'Verification code has expired. Please start signup again.' });
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(429).json({ message: 'Too many incorrect attempts. Please start signup again.' });
    }

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

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await OtpVerification.findByIdAndDelete(pending._id);
      return res.status(400).json({ message: 'Email already registered.' });
    }

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
      firebaseUid:   null,
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
    await OtpVerification.findByIdAndDelete(pending._id);
    await logAudit(createdUser._id, 'signup', { ip, device: parseUA(req.headers['user-agent'] || ''), severity: 'info' }).catch(() => {});

    const session = await issueSession(res, createdUser, req);
    res.status(201).json({ ...session, message: 'Account created successfully!' });
  } catch (err) { next(err); }
};

exports.resendSignupOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const pending = await OtpVerification.findOne({ email: email.toLowerCase() });

    if (!pending) {
      return res.status(400).json({ message: 'No pending verification found. Please start signup again.' });
    }

    if (pending.resendCount >= OTP_MAX_RESENDS) {
      return res.status(429).json({ message: 'Maximum resend limit reached. Please start signup again.' });
    }

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
      message:      'A new verification code has been sent to your email.',
      expiryMins:   OTP_EXPIRY_MINS,
      cooldownSecs: OTP_RESEND_COOLDOWN_SECS,
    });
  } catch (err) { next(err); }
};

/**
 * Firebase Sign-In (replaces googleAuth).
 *
 * Accepts a Firebase ID token from the client SDK.  Works with any provider
 * enabled in your Firebase project (Google, Email link, Phone, etc.).
 *
 * POST /api/auth/firebase
 * Body: { idToken, deviceId? }
 */
exports.firebaseAuthHandler = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required.' });

    // ── Verify the token with Firebase Admin SDK ────────────────────────────
    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error('[Firebase Auth] Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid Firebase token. Please try again.' });
    }

    const { uid, email, name, picture, email_verified } = decoded;

    if (!email_verified) {
      return res.status(400).json({ message: 'Firebase account email is not verified.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || '';
    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: email.toLowerCase() }] });
    let isNew = false;

    if (!user) {
      user = await User.create({
        name:          name || email.split('@')[0],
        email:         email.toLowerCase(),
        password:      null,
        firebaseUid:   uid,
        avatar:        picture || null,
        emailVerified: true,
      });
      isNew = true;
      await logAudit(user._id, 'signup_firebase', { ip, severity: 'info' }).catch(() => {});
    } else {
      // Link Firebase UID if not already linked
      if (!user.firebaseUid) {
        user.firebaseUid   = uid;
        user.emailVerified = true;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    }

    // deviceId is forwarded via req.body and picked up inside issueSession
    const session = await issueSession(res, user, req);

    res.status(isNew ? 201 : 200).json({
      ...session,
      isNewUser: isNew,
      message:   isNew ? 'Account created with Firebase!' : 'Logged in with Firebase!',
    });
  } catch (err) { next(err); }
};

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

    // Firebase-only accounts cannot log in with a password
    if (!user.password && user.firebaseUid) {
      return res.status(400).json({ message: 'This account uses Firebase Sign-In. Please continue with that method.' });
    }

    // deviceId (if present in req.body) is forwarded into issueSession automatically
    const session = await issueSession(res, user, req);
    res.json(session);
  } catch (err) { next(err); }
};

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
