const router = require('express').Router();
const {
  signup, login, logout, refreshToken
} = require('../controllers/auth.controller');

router.post('/signup', signup);
router.post('/login',  login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

module.exports = router;