const router      = require('express').Router();
const mongoose    = require('mongoose');
const SecurityLog = require('../models/SecurityLog');
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

/**
 * GET /api/audit/logs
 * Query params: userId, action, severity, from (ISO), to (ISO), page, limit (max 100)
 * Admin only.
 */
router.get('/logs', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      userId,
      action,
      severity,
      from,
      to,
      page  = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (userId   && mongoose.Types.ObjectId.isValid(userId)) filter.userId = userId;
    if (action)   filter.action   = action;
    if (severity) filter.severity = severity;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip     = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SecurityLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/audit/summary
 * Counts grouped by action + severity for the last 30 days.
 * Admin only.
 */
router.get('/summary', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const summary = await SecurityLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id:   { action: '$action', severity: '$severity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.severity': 1, count: -1 } },
    ]);

    res.json({ since, summary });
  } catch (err) { next(err); }
});

module.exports = router;