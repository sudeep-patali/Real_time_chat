const User   = require('../models/User');
const Report = require('../models/Report');
const Room   = require('../models/Room');
const Message = require('../models/Message');

// GET /api/users/search
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ users: [] });

    const users = await User.find({
      $or: [
        { name:  { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    })
    .select('name email avatar isOnline bio lastSeen username statusValue customStatus')
    .limit(20);

    res.json({
      users: users.map(u => ({
        id:          u._id,
        name:        u.name,
        email:       u.email,
        avatar:      u.avatar,
        isOnline:    u.isOnline,
        bio:         u.bio,
        lastSeen:    u.lastSeen,
        username:    u.username,
        statusValue: u.statusValue,
        customStatus: u.customStatus,
      }))
    });
  } catch (err) { next(err); }
};

// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name email avatar isOnline bio lastSeen username statusValue customStatus')
      .limit(50)
      .sort({ name: 1 });

    res.json({
      users: users.map(u => ({
        id:          u._id,
        name:        u.name,
        email:       u.email,
        avatar:      u.avatar,
        isOnline:    u.isOnline,
        bio:         u.bio,
        lastSeen:    u.lastSeen,
        username:    u.username,
        statusValue: u.statusValue,
        customStatus: u.customStatus,
      }))
    });
  } catch (err) { next(err); }
};

// GET /api/users/:userId
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email avatar isOnline bio lastSeen createdAt username statusValue customStatus privacy');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const me = await User.findById(req.user._id).select('blockedUsers mutedUsers');
    const isBlocked    = me.blockedUsers.map(id => id.toString()).includes(user._id.toString());
    const isMuted      = me.mutedUsers.map(id => id.toString()).includes(user._id.toString());
    const otherUser    = await User.findById(user._id).select('blockedUsers');
    const hasBlockedMe = otherUser.blockedUsers.map(id => id.toString()).includes(req.user._id.toString());

    res.json({
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        avatar:       user.avatar,
        isOnline:     user.isOnline,
        bio:          user.bio,
        lastSeen:     user.lastSeen,
        memberSince:  user.createdAt,
        username:     user.username,
        statusValue:  user.statusValue,
        customStatus: user.customStatus,
        isBlocked,
        isMuted,
        hasBlockedMe
      }
    });
  } catch (err) { next(err); }
};

// PUT /api/users/me
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatar, username, statusValue, customStatus } = req.body;

    const updateFields = {};
    if (name  !== undefined) updateFields.name  = name;
    if (bio   !== undefined) updateFields.bio   = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (username !== undefined) updateFields.username = username;
    if (statusValue !== undefined) updateFields.statusValue = statusValue;
    if (customStatus !== undefined) updateFields.customStatus = customStatus;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        avatar:       user.avatar,
        bio:          user.bio,
        role:         user.role,
        username:     user.username,
        statusValue:  user.statusValue,
        customStatus: user.customStatus,
        isOnline:     user.isOnline,
        lastSeen:     user.lastSeen,
        createdAt:    user.createdAt,
      }
    });
  } catch (err) { next(err); }
};

// PUT /api/users/me/privacy
exports.updatePrivacy = async (req, res, next) => {
  try {
    const { profilePhoto, lastSeen, onlineStatus, addToGroups, messages } = req.body;

    const privacyUpdate = {};
    if (profilePhoto !== undefined) privacyUpdate['privacy.profilePhoto'] = profilePhoto;
    if (lastSeen     !== undefined) privacyUpdate['privacy.lastSeen']     = lastSeen;
    if (onlineStatus !== undefined) privacyUpdate['privacy.onlineStatus'] = onlineStatus;
    if (addToGroups  !== undefined) privacyUpdate['privacy.addToGroups']  = addToGroups;
    if (messages     !== undefined) privacyUpdate['privacy.messages']     = messages;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: privacyUpdate },
      { new: true }
    ).select('privacy');

    res.json({ privacy: user.privacy, message: 'Privacy settings updated' });
  } catch (err) { next(err); }
};

// GET /api/users/me/stats
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Message model uses `senderId`, Room model uses `participantIds`
    const messagesSent = await Message.countDocuments({ senderId: userId });

    const groupsJoined = await Room.countDocuments({
      isGroup: true,
      participantIds: userId
    });

    const sharedMessages = await Message.find({
      senderId: userId,
      type: { $in: ['file', 'document', 'image', 'video', 'audio', 'gif'] }
    }).select('type');

    const filesShared = sharedMessages.filter(m => ['file', 'document', 'audio'].includes(m.type)).length;
    const mediaShared = sharedMessages.filter(m => ['image', 'video', 'gif'].includes(m.type)).length;

    res.json({ messagesSent, groupsJoined, filesShared, mediaShared });
  } catch (err) { next(err); }
};

// GET /api/users/me/blocked
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('blockedUsers')
      .populate('blockedUsers', 'name email avatar username');

    const users = (me.blockedUsers || []).map(u => ({
      id:       u._id,
      name:     u.name,
      email:    u.email,
      avatar:   u.avatar,
      username: u.username,
    }));

    res.json({ users });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/block
exports.blockUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('blockedUsers');
    const targetId = req.params.userId;
    const alreadyBlocked = me.blockedUsers.map(id => id.toString()).includes(targetId);

    if (alreadyBlocked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: targetId } });
      return res.json({ message: 'User unblocked', isBlocked: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: targetId } });
    res.json({ message: 'User blocked', isBlocked: true });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/report
exports.reportUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const existing = await Report.findOne({
      reportedBy: req.user._id, targetType: 'user', targetId: req.params.userId
    });
    if (existing) return res.json({ message: 'Already reported' });

    await Report.create({
      reportedBy: req.user._id, targetType: 'user',
      targetId: req.params.userId, reason: reason || 'No reason provided'
    });
    res.json({ message: 'Report submitted. Thank you.' });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/mute
exports.muteUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('mutedUsers');
    const targetId = req.params.userId;
    const alreadyMuted = me.mutedUsers.map(id => id.toString()).includes(targetId);

    if (alreadyMuted) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { mutedUsers: targetId } });
      return res.json({ message: 'User unmuted', isMuted: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { mutedUsers: targetId } });
    res.json({ message: 'User muted', isMuted: true });
  } catch (err) { next(err); }
};