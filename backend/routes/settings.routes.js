const router      = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl        = require('../controllers/settings.controller');

router.get   ('/me/settings',        protect, ctrl.getSettings);
router.put   ('/me/settings',        protect, ctrl.updateSettings);
router.delete('/me',                 protect, ctrl.deleteAccount);
router.get   ('/me/export',          protect, ctrl.exportChatHistory);
router.get   ('/me/data',            protect, ctrl.downloadMyData);
router.get   ('/me/sessions',        protect, ctrl.getSessions);
router.delete('/me/sessions/:id',    protect, ctrl.deleteSession);
router.delete('/me/sessions',        protect, ctrl.deleteAllSessions);
router.get   ('/me/security-logs',   protect, ctrl.getSecurityLogs);

// Phase 1: client calls this to trigger a cacheCleared socket event so all
// other open tabs of the same user know to wipe their localStorage as well.
router.post  ('/me/clear-cache',     protect, ctrl.clearCache);

module.exports = router;