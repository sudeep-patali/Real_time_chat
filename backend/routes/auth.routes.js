const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');
const {
  signup, login, logout, refreshToken,
} = require('../controllers/auth.controller');
const settingsCtrl = require('../controllers/settings.controller');

// ── Shared validation error handler ──────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── Validation chains ─────────────────────────────────────────────────────────
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/signup',          signupRules, validate, signup);
router.post('/login',           loginRules,  validate, login);
router.post('/logout',          protect,     logout);
router.post('/refresh',         refreshToken);
router.put ('/change-password', protect,     settingsCtrl.changePassword);
router.post('/forgot-password',              settingsCtrl.forgotPassword);
router.post('/verify-otp',                   settingsCtrl.verifyOtp);
router.delete('/sessions',      protect,     settingsCtrl.logoutAllDevices);

module.exports = router;