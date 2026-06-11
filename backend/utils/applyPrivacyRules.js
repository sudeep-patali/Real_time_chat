/**
 * applyPrivacyRules.js  —  backend/utils/applyPrivacyRules.js
 *
 * Centralised privacy filter.
 *
 * Every API and socket path that exposes user data to another user
 * MUST pass the data through this utility before sending it to the
 * frontend.  Nothing should be filtered individually in controllers.
 *
 * Usage:
 *   const applyPrivacyRules = require('../utils/applyPrivacyRules')
 *   const filtered = await applyPrivacyRules(viewerUser, targetUser)
 *
 * Parameters:
 *   viewerUser  — the requesting user document (or just their _id)
 *   targetUser  — the full User document to be filtered
 *                 (must contain .privacy, .avatar, .isOnline, .lastSeen)
 *
 * Returns a plain privacy-filtered object:
 *   {
 *     id, name, username, email, bio,
 *     profileImage,   ← null when hidden
 *     onlineStatus,   ← null when hidden
 *     lastSeen,       ← null when hidden
 *     canMessage,     ← false when messaging is blocked
 *     canAddToGroup,  ← false when group-add is blocked
 *   }
 */

const Room = require('../models/Room');

/**
 * Returns true when viewerId has an accepted DM room with targetUserId,
 * meaning they are "contacts" in the app's contact model.
 */
async function isContact(viewerId, targetUserId) {
  if (!viewerId || !targetUserId) return false;
  const room = await Room.findOne({
    isGroup: false,
    participantIds: { $all: [viewerId, targetUserId] },
    status: 'accepted',
  }).select('_id').lean();
  return !!room;
}

/**
 * Core function.  viewerUser can be a full document or just an _id / id.
 * targetUser must be a full Mongoose document or lean object with .privacy.
 */
async function applyPrivacyRules(viewerUser, targetUser) {
  // ── Resolve viewer id ────────────────────────────────────────────────────
  const viewerId = (
    viewerUser?._id
    || viewerUser?.id
    || viewerUser
  )?.toString();

  const targetId = (targetUser?._id || targetUser?.id)?.toString();

  // Owner always receives their own raw data
  const isSelf = viewerId && targetId && viewerId === targetId;

  const privacy = targetUser.privacy || {};

  if (isSelf) {
    return {
      id:            targetId,
      name:          targetUser.name,
      username:      targetUser.username      || '',
      email:         targetUser.email         || '',
      bio:           targetUser.bio           || '',
      profileImage:  targetUser.avatar        || null,
      onlineStatus:  targetUser.isOnline      ?? false,
      lastSeen:      targetUser.lastSeen      || null,
      canMessage:    true,
      canAddToGroup: true,
    };
  }

  // ── Determine contact relationship ───────────────────────────────────────
  const contact = await isContact(viewerId, targetId);

  /**
   * Returns true when a viewer is allowed to see a field given the setting.
   *   'everyone'  → always allowed
   *   'accepted'  → only accepted contacts
   *   'nobody'    → never (except self, handled above)
   */
  const canSee = (setting) => {
    if (setting === 'everyone') return true;
    if (setting === 'accepted') return contact;
    return false; // 'nobody'
  };

  return {
    id:            targetId,
    name:          targetUser.name,
    username:      targetUser.username      || '',
    email:         targetUser.email         || '',
    bio:           targetUser.bio           || '',
    profileImage:  canSee(privacy.profilePhoto)  ? (targetUser.avatar   || null) : null,
    onlineStatus:  canSee(privacy.onlineStatus)  ? (targetUser.isOnline ?? false) : null,
    lastSeen:      canSee(privacy.lastSeen)      ? (targetUser.lastSeen  || null) : null,
    canMessage:    canSee(privacy.messages),
    canAddToGroup: canSee(privacy.addToGroups),
  };
}

/**
 * Convenience: applies privacy rules to an array of target users in parallel.
 * Returns an array in the same order.
 */
applyPrivacyRules.many = async function (viewerUser, targetUsers) {
  return Promise.all(targetUsers.map(u => applyPrivacyRules(viewerUser, u)));
};

module.exports = applyPrivacyRules;