const User        = require('../models/User');
const UserSession = require('../models/UserSession');
const SecurityLog = require('../models/SecurityLog');

function parseUA(ua = '') {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  if (/Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edge/.test(ua)) browser = 'Edge';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  return `${browser} on ${os}`;
}
const jwt  = require('jsonwebtoken');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email,
              avatar: user.avatar, role: user.role },
      token
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    const token = generateToken(user._id);

    // Track session and log
    try {
      const ua = req.headers['user-agent'] || '';
      const ip = req.ip || req.connection?.remoteAddress || '';
      await UserSession.create({ userId: user._id, token, device: parseUA(ua), ip, userAgent: ua });
      await SecurityLog.create({ userId: user._id, action: 'login', device: parseUA(ua), ip });
    } catch (_) { /* non-fatal */ }

    res.json({
      user: { id: user._id, name: user.name, email: user.email,
              avatar: user.avatar, role: user.role },
      token
    });
  } catch (err) { next(err); }
};

exports.logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ token: generateToken(decoded.id) });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};