const router      = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl        = require('../controllers/settings.controller');

// ── User Settings ─────────────────────────────────────────────────────────────
router.get   ('/me/settings',      protect, ctrl.getSettings);
router.put   ('/me/settings',      protect, ctrl.updateSettings);

// ── Account ───────────────────────────────────────────────────────────────────
router.delete('/me',               protect, ctrl.deleteAccount);
router.get   ('/me/export',        protect, ctrl.exportChatHistory);
router.get   ('/me/data',          protect, ctrl.downloadMyData);

// ── Sessions / Device Management ─────────────────────────────────────────────
router.get   ('/me/sessions',      protect, ctrl.getSessions);

router.delete('/me/sessions/:id/force', protect, ctrl.logoutDevice);

router.delete('/me/sessions/:id',  protect, ctrl.deleteSession);
router.delete('/me/sessions',      protect, ctrl.deleteAllSessions);

// ── Security Logs ─────────────────────────────────────────────────────────────
router.get   ('/me/security-logs', protect, ctrl.getSecurityLogs);

router.post  ('/me/clear-cache',   protect, ctrl.clearCache);

module.exports = router;
