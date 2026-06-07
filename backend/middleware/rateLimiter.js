const rateLimit = require('express-rate-limit');

/**
 * loginLimiter — stricter limit for the login endpoint.
 * 10 attempts per 15-minute window; only counts failed requests.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true, // don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

/**
 * apiLimiter — general limit for all API routes.
 * 120 requests per minute per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, apiLimiter };