const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

/**
 * OtpVerification — holds a pending signup request until the user
 * verifies their email.  The document is intentionally separate from
 * User so that no account record is created until verification succeeds.
 *
 * Fields
 * ──────
 *  email        – the address the OTP was sent to (indexed for fast lookup)
 *  name         – full name the user entered on the signup form
 *  passwordHash – bcrypt hash of the user's chosen password (never plain text)
 *  otpHash      – bcrypt hash of the 6-digit OTP (never stored in plain text)
 *  expiresAt    – UTC timestamp after which the OTP is invalid (TTL index)
 *  attempts     – number of failed verification attempts (brute-force guard)
 *  resendCount  – how many times a resend was requested in this window
 *  lastResendAt – timestamp of the most recent resend (cooldown guard)
 */
const otpVerificationSchema = new mongoose.Schema({
  email: {
    type:     String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  name: {
    type:     String,
    required: true,
    trim: true,
  },

  passwordHash: {
    type:     String,
    required: true,
  },

  otpHash: {
    type:     String,
    required: true,
  },

  // MongoDB TTL index: Mongo auto-deletes this document after expiresAt
  expiresAt: {
    type:    Date,
    required: true,
    index: { expires: 0 },   // TTL index — value 0 means "delete at expiresAt"
  },

  attempts: {
    type:    Number,
    default: 0,
  },

  resendCount: {
    type:    Number,
    default: 0,
  },

  lastResendAt: {
    type:    Date,
    default: null,
  },
}, { timestamps: true });

// Verify a plain-text OTP against the stored hash
otpVerificationSchema.methods.matchOtp = async function (plainOtp) {
  return bcrypt.compare(String(plainOtp), this.otpHash);
};

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);