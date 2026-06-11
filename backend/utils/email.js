/**
 * email.js — thin wrapper around Nodemailer for sending transactional emails.
 *
 * Configuration (add to your .env):
 *   EMAIL_HOST     – SMTP host,    e.g. smtp.gmail.com
 *   EMAIL_PORT     – SMTP port,    e.g. 587
 *   EMAIL_SECURE   – "true" for port 465, "false" otherwise
 *   EMAIL_USER     – SMTP username (your sending address)
 *   EMAIL_PASS     – SMTP password / app password
 *   EMAIL_FROM     – "From" header,  e.g. "Wheeltrix <noreply@wheeltrix.app>"
 *
 * For Gmail use an App Password (not your account password) with
 * EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_SECURE=false.
 */

const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return _transporter;
}

/**
 * sendOtpEmail — sends a nicely formatted OTP email.
 *
 * @param {string} to         recipient email address
 * @param {string} name       recipient's display name
 * @param {string} otp        the 6-digit code (plain text)
 * @param {number} expiryMins how many minutes the OTP is valid
 */
async function sendOtpEmail(to, name, otp, expiryMins = 10) {
  const from = process.env.EMAIL_FROM || `"Wheeltrix" <${process.env.EMAIL_USER}>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1a1d27;border-radius:16px;border:1px solid #2a2d3a;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 24px;text-align:center;border-bottom:1px solid #2a2d3a;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:#00a884;border-radius:14px;margin-bottom:12px;">
                <span style="color:#fff;font-size:26px;font-weight:800;line-height:52px;">W</span>
              </div>
              <h1 style="margin:0;color:#00a884;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Wheeltrix</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 8px;color:#e2e8f0;font-size:16px;font-weight:600;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                Use the verification code below to complete your sign-up. This code expires in <strong style="color:#e2e8f0;">${expiryMins} minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#0f1117;border:2px solid #00a884;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#00a884;font-family:monospace;">${otp}</span>
              </div>

              <p style="margin:0 0 4px;color:#64748b;font-size:12px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your account will not be created.
              </p>
              <p style="margin:0;color:#64748b;font-size:12px;">
                For security, never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px;border-top:1px solid #2a2d3a;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">© ${new Date().getFullYear()} Wheeltrix. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from,
    to,
    subject: `${otp} is your Wheeltrix verification code`,
    text:    `Hi ${name},\n\nYour Wheeltrix verification code is: ${otp}\n\nThis code expires in ${expiryMins} minutes.\n\nIf you didn't request this, please ignore this email.`,
    html,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendOtpEmail };