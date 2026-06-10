const router      = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const upload      = require('../middleware/upload.middleware')
const roomCtrl    = require('../controllers/room.controller')
const grpCtrl     = require('../controllers/group.controller')

const injectIo = (io) => (req, _res, next) => { req.io = io; next() }

module.exports = (io) => {
  const withIo = injectIo(io)

  // ── Group creation ─────────────────────────────────────────────────────
  router.post('/create', protect, upload.single('avatar'), roomCtrl.createGroup)

  // ── Invitation flow ────────────────────────────────────────────────────
  router.post('/invite',                        protect, withIo, grpCtrl.inviteUsers)
  router.get ('/invitations/pending',           protect,         grpCtrl.getPendingInvitations)
  router.post('/invitation/:id/accept',         protect, withIo, grpCtrl.acceptInvitation)
  router.post('/invitation/:id/reject',         protect, withIo, grpCtrl.rejectInvitation)

  // ── Group-level management ─────────────────────────────────────────────
  router.put   ('/:id',                         protect, upload.single('avatar'), withIo, grpCtrl.updateGroup)
  router.delete('/:id',                         protect, withIo, grpCtrl.deleteGroup)

  // ── Member management ──────────────────────────────────────────────────
  router.post  ('/:id/members',                 protect, withIo, grpCtrl.addMember)
  router.delete('/:id/members/:memberId',       protect, withIo, grpCtrl.removeMember)

  // ── Admin management ───────────────────────────────────────────────────
  router.post  ('/:id/admins/:memberId',        protect, withIo, grpCtrl.makeAdmin)
  router.delete('/:id/admins/:memberId',        protect, withIo, grpCtrl.removeAdmin)

  // ── Invitation management ──────────────────────────────────────────────
  router.get   ('/:id/invitations',             protect,         grpCtrl.getGroupInvitations)
  router.delete('/:id/invitations/:invId',      protect, withIo, grpCtrl.cancelInvitation)

  return router
}