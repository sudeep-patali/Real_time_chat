const User = require('../models/User');
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