const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  signup, login, logout, refreshToken
} = require('../controllers/auth.controller');
const settingsCtrl = require('../controllers/settings.controller');

router.post('/signup', signup);
router.post('/login',  login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.put ('/change-password', protect, settingsCtrl.changePassword);
router.post('/forgot-password', settingsCtrl.forgotPassword);
router.post('/verify-otp',      settingsCtrl.verifyOtp);
router.delete('/sessions',      protect, settingsCtrl.logoutAllDevices);

module.exports = router;