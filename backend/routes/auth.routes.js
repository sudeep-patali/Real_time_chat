/**
 * auth.routes.js  —  backend/routes/auth.routes.js
 *
 * CHANGE: /auth/google  →  /auth/firebase
 *         googleAuth    →  firebaseAuthHandler
 */

const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const {
  sendSignupOtp,
  verifySignupOtp,
  resendSignupOtp,
  firebaseAuthHandler,   // ← renamed from googleAuth
  login,
  logout,
  refreshToken,
} = require('../controllers/auth.controller');
const settingsCtrl = require('../controllers/settings.controller');

// ── Shared validation error handler ──────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── Validation chains ─────────────────────────────────────────────────────────
const sendOtpRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const verifyOtpRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Rate limiters ─────────────────────────────────────────────────────────────

const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please try again in an hour.' },
});

const otpResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many resend requests. Please try again later.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please try again later.' },
});

/** Firebase auth limiter — 20 per 15 min per IP */
const firebaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many Firebase auth requests. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Email OTP signup flow
router.post('/signup/send-otp',   otpSendLimiter,   sendOtpRules,   validate, sendSignupOtp);
router.post('/signup/verify-otp', otpVerifyLimiter, verifyOtpRules, validate, verifySignupOtp);
router.post('/signup/resend-otp', otpResendLimiter,                           resendSignupOtp);

// Firebase Sign-In (replaces /google)
router.post('/firebase', firebaseLimiter, firebaseAuthHandler);

// Email + password login
router.post('/login',           loginLimiter, loginRules, validate, login);

// Session management
router.post('/logout',          protect, logout);
router.post('/refresh',         refreshToken);
router.put ('/change-password', protect, settingsCtrl.changePassword);
router.post('/forgot-password',          settingsCtrl.forgotPassword);
router.post('/verify-otp',               settingsCtrl.verifyOtp);
router.delete('/sessions',      protect, settingsCtrl.logoutAllDevices);

module.exports = router;