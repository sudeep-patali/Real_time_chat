const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token (15 min).
 * Signed with JWT_ACCESS_SECRET.
 */
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
  });

/**
 * Generate a long-lived refresh token (7 days).
 * Signed with JWT_REFRESH_SECRET.
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

module.exports = { generateAccessToken, generateRefreshToken };