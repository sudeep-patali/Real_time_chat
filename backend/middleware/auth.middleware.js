const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const UserSession = require('../models/UserSession');

// ── protect ───────────────────────────────────────────────────────────────────
//
// Phase 2 upgrade: after verifying the JWT signature we now also look up the
// UserSession record and confirm it is still active (isActive !== false).
//
// This means that when an admin or the user themselves revokes a session via
// DELETE /me/sessions/:id, any request bearing that JWT is immediately blocked
// with SESSION_REVOKED — no waiting for the token to naturally expire.
//
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 1. Verify JWT signature and expiry
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // 2. Confirm the session record still exists and has not been revoked.
      //    We treat a missing record OR isActive === false as revoked.
      const session = await UserSession.findOne({
        userId:   decoded.id,
        token:    token,
        isActive: { $ne: false },
      });

      if (!session) {
        return res.status(401).json({
          message: 'Session revoked',
          code:    'SESSION_REVOKED',
        });
      }

      // 3. Hydrate req.user (exclude password as always)
      req.user = await User.findById(decoded.id).select('-password');

      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // Signal the frontend to attempt a silent refresh
        return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'Token invalid' });
    }
  }

  if (!token) return res.status(401).json({ message: 'No token provided' });
};

module.exports = { protect };
