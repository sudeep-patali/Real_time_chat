/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.delete('/users/:id', protect, requireRole('admin'), handler)
 *   router.get('/audit/logs',   protect, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};

module.exports = { requireRole };