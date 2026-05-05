const nodemailer = require('nodemailer');

/**
 * Create and return a nodemailer transporter.
 * In development, uses SMTP credentials from .env (Mailtrap recommended).
 * In production, swap for SendGrid / SES / etc.
 */
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const FROM_NAME = 'GoalConnect ⚽';
const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@goalconnect.et';

// ─── HTML Email Templates ──────────────────────────────────────────────────

const baseTemplate = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f4f4f4; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
    .header h1 { color: #00d4aa; margin: 0; font-size: 26px; letter-spacing: 1px; }
    .header p { color: #aaa; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; color: #333333; line-height: 1.6; }
    .body h2 { color: #1a1a2e; margin-top: 0; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #00d4aa; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .divider { border: none; border-top: 1px solid #eeeeee; margin: 24px 0; }
    .note { font-size: 12px; color: #888888; }
    .footer { background: #f9f9f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>⚽ GoalConnect</h1>
      <p>Ethiopian Football Talent Platform</p>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} GoalConnect. All rights reserved.<br/>
      This is an automated message — please do not reply directly.
    </div>
  </div>
</body>
</html>
`;

// ─── Email Senders ─────────────────────────────────────────────────────────

/**
 * Send email verification link to a newly registered user.
 * @param {string} toEmail   Recipient email address
 * @param {string} rawToken  The unhashed token to embed in the link
 */
const sendVerificationEmail = async (toEmail, rawToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?verify_token=${rawToken}`;

  const html = baseTemplate(
    'Verify Your Email — GoalConnect',
    `
    <h2>Verify Your Email Address</h2>
    <p>Hello,</p>
    <p>
      Thank you for registering with <strong>GoalConnect</strong>!
      Please verify your email address by clicking the button below.
    </p>
    <a href="${verifyUrl}" class="btn">Verify My Email</a>
    <hr class="divider"/>
    <p class="note">
      This link will expire in <strong>24 hours</strong>.<br/>
      If you did not create an account, you can safely ignore this email.
    </p>
    <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
    <p class="note"><a href="${verifyUrl}">${verifyUrl}</a></p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: '✅ Verify Your Email — GoalConnect',
    html,
    text: `Verify your GoalConnect email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

/**
 * Send password reset link to the user.
 * @param {string} toEmail   Recipient email address
 * @param {string} rawToken  The unhashed token to embed in the link
 */
const sendPasswordResetEmail = async (toEmail, rawToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?reset_token=${rawToken}`;

  const html = baseTemplate(
    'Reset Your Password — GoalConnect',
    `
    <h2>Password Reset Request</h2>
    <p>Hello,</p>
    <p>
      We received a request to reset the password for your <strong>GoalConnect</strong> account
      associated with this email address.
    </p>
    <a href="${resetUrl}" class="btn">Reset My Password</a>
    <hr class="divider"/>
    <p class="note">
      This link will expire in <strong>10 minutes</strong>.<br/>
      If you did not request a password reset, please ignore this email — your account is safe.
    </p>
    <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
    <p class="note"><a href="${resetUrl}">${resetUrl}</a></p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: '🔐 Password Reset — GoalConnect',
    html,
    text: `Reset your GoalConnect password by visiting: ${resetUrl}\n\nThis link expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
  });
};

/**
 * Send password reset success notification.
 * @param {string} toEmail   Recipient email address
 */
const sendPasswordResetSuccessEmail = async (toEmail) => {
  const html = baseTemplate(
    'Password Reset Successful — GoalConnect',
    `
    <h2>Password Reset Successful</h2>
    <p>Hello,</p>
    <p>
      This is a confirmation that the password for your <strong>GoalConnect</strong> account 
      associated with this email address has just been changed.
    </p>
    <hr class="divider"/>
    <p class="note">
      If you made this change, you don't need to do anything else.<br/><br/>
      <strong>If you did not change your password, please contact our support team immediately to secure your account.</strong>
    </p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: '✅ Password Reset Successful — GoalConnect',
    html,
    text: `Your GoalConnect password has been successfully reset.\n\nIf you did not make this change, please contact support immediately.`,
  });
};

/**
 * Send a welcome email to newly registered users.
 * @param {string} toEmail   Recipient email address
 */
const sendWelcomeEmail = async (toEmail) => {
  const html = baseTemplate(
    'Welcome to GoalConnect! ⚽',
    `
    <h2>Welcome to GoalConnect!</h2>
    <p>Hello,</p>
    <p>
      We are thrilled to welcome you to <strong>GoalConnect</strong>, the premier Ethiopian Football Talent Platform.
    </p>
    <p>
      Your account has been successfully created. You can now explore talents, share videos, and connect with academies and scouts.
    </p>
    <hr class="divider"/>
    <p class="note">
      If you haven't already, please remember to verify your email address.
    </p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: '⚽ Welcome to GoalConnect!',
    html,
    text: `Welcome to GoalConnect! Your account has been created successfully.`,
  });
};

/**
 * Send a new login alert email.
 * @param {string} toEmail   Recipient email address
 * @param {string} ipAddress The IP address of the login request
 * @param {string} device    User-Agent or device description
 */
const sendLoginAlertEmail = async (toEmail, ipAddress, device) => {
  const html = baseTemplate(
    'New Login Alert — GoalConnect',
    `
    <h2>New Login Detected</h2>
    <p>Hello,</p>
    <p>
      We noticed a new login to your <strong>GoalConnect</strong> account.
    </p>
    <ul>
      <li><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</li>
      <li><strong>IP Address:</strong> ${ipAddress || 'Unknown'}</li>
      <li><strong>Device/Browser:</strong> ${device || 'Unknown'}</li>
    </ul>
    <hr class="divider"/>
    <p class="note">
      If this was you, you can safely ignore this email.<br/><br/>
      <strong>If you did not authorize this login, please reset your password immediately.</strong>
    </p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: '🛡️ Security Alert: New Login Detected',
    html,
    text: `A new login was detected on your account.\n\nIP: ${ipAddress}\nDevice: ${device}\n\nIf this wasn't you, reset your password immediately.`,
  });
};

/**
 * Send an email to a newly created player by an academy.
 * @param {string} toEmail     Player's email
 * @param {string} playerName  Player's full name
 * @param {string} academyName Academy name
 * @param {string} rawPassword The auto-generated or chosen raw password
 */
const sendPlayerAccountCreationEmail = async (toEmail, playerName, academyName, rawPassword) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

  const html = baseTemplate(
    'Welcome to Your GoalConnect Player Account!',
    `
    <h2>Welcome, ${playerName}!</h2>
    <p>
      Your football academy, <strong>${academyName}</strong>, has officially added you to 
      the <strong>GoalConnect</strong> platform.
    </p>
    <p>
      GoalConnect is the premier Ethiopian Football Talent Platform where you can 
      track your progress, share videos, and get discovered by scouts.
    </p>
    <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin-top: 0; margin-bottom: 8px;"><strong>Your Login Credentials:</strong></p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${toEmail}</p>
      <p style="margin: 4px 0;"><strong>Password:</strong> ${rawPassword}</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${loginUrl}" class="button">Log In to Your Account</a>
    </div>
    <hr class="divider"/>
    <p class="note">
      For your security, please log in and change your password immediately.
    </p>
    `
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: `⚽ You've been added to ${academyName} on GoalConnect!`,
    html,
    text: `Welcome ${playerName}!\n\n${academyName} has added you to GoalConnect.\n\nLogin at: ${loginUrl}\nEmail: ${toEmail}\nPassword: ${rawPassword}\n\nPlease change your password after logging in.`,
  });
};

module.exports = { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordResetSuccessEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPlayerAccountCreationEmail
};
