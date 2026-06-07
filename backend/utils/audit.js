const SecurityLog = require('../models/SecurityLog');

/**
 * logAudit — thin wrapper around SecurityLog.create.
 *
 * @param {string|ObjectId} userId
 * @param {string}          action  — must match the SecurityLog action enum
 * @param {object}          options
 * @param {string}          [options.ip]
 * @param {string}          [options.device]
 * @param {string}          [options.severity='info']
 * @param {object}          [options.meta={}]   — arbitrary context; NEVER include message content or tokens
 */
const logAudit = async (userId, action, { ip = '', device = '', severity = 'info', meta = {} } = {}) => {
  try {
    await SecurityLog.create({ userId, action, ip, device, severity, meta });
  } catch (err) {
    // Audit failures must never crash the application.
    console.error('[audit] Failed to write SecurityLog:', err.message);
  }
};

module.exports = { logAudit };