const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Academy = require('../models/Academy');
const Scout = require('../models/Scout');
const Player = require('../models/Player');
const { generateRawToken, hashToken } = require('../utils/tokenUtils');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordResetSuccessEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail 
} = require('../utils/email');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Send token response with cookie
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
};

/**
 * @desc    Register a new user (Academy or Scout)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, role, ...profileData } = req.body;

    // Validate role
    if (!['academy', 'scout'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only academy and scout registration is allowed.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Generate email verification token
    const rawVerificationToken = generateRawToken();
    const hashedVerificationToken = hashToken(rawVerificationToken);

    // Create user
    const user = await User.create({
      email,
      password,
      role,
      status: 'pending', // Needs admin approval
      verificationToken: hashedVerificationToken,
      emailVerified: false,
    });

    // Create role-specific profile
    if (role === 'academy') {
      await Academy.create({
        user: user._id,
        name: profileData.name || 'Unnamed Academy',
        region: profileData.region,
        woreda: profileData.woreda,
        address: profileData.address,
        ownerName: profileData.ownerName,
        contactPhone: profileData.contactPhone,
        registrationStatus: 'awaiting_approval',
      });
    } else if (role === 'scout') {
      await Scout.create({
        user: user._id,
        fullName: profileData.fullName || 'Unnamed Scout',
        organization: profileData.organization,
        country: profileData.country || 'Ethiopia',
        phone: profileData.phone,
        interestedPositions: profileData.interestedPositions || [],
      });
    }

    // Send verification email — non-blocking
    sendVerificationEmail(user.email, rawVerificationToken).catch((err) =>
      console.error('Failed to send verification email:', err.message)
    );

    // Send welcome email — non-blocking
    sendWelcomeEmail(user.email).catch((err) =>
      console.error('Failed to send welcome email:', err.message)
    );

    sendTokenResponse(user, 201, res, 'Registration successful. Please check your email to verify your account.');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Check if user is rejected
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your registration has been rejected. Please contact support for more information.',
      });
    }

    // Extract request info for security alert
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    // Send login security alert — non-blocking
    sendLoginAlertEmail(user.email, ipAddress, userAgent).catch((err) =>
      console.error('Failed to send login alert email:', err.message)
    );

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let profile = null;

    // Get role-specific profile
    if (user.role === 'academy') {
      profile = await Academy.findOne({ user: user._id });
    } else if (user.role === 'scout') {
      profile = await Scout.findOne({ user: user._id });
    } else if (user.role === 'player') {
      profile = await Player.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
const updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client storage.',
  });
};

/**
 * @desc    Verify email address via token
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const hashedToken = hashToken(req.params.token);

    const user = await User.findOne({ verificationToken: hashedToken });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Your email is already verified. You can log in.',
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Resend email verification link
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success to prevent user enumeration
    if (!user || user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account with that email exists, a verification link has been sent.',
      });
    }

    const rawToken = generateRawToken();
    user.verificationToken = hashToken(rawToken);
    await user.save();

    sendVerificationEmail(user.email, rawToken).catch((err) =>
      console.error('Failed to resend verification email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'If an unverified account with that email exists, a verification link has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Request a password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const rawToken = generateRawToken();
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    sendPasswordResetEmail(user.email, rawToken).catch((err) =>
      console.error('Failed to send password reset email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Reset password using token
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = hashToken(req.params.token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // token must not be expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send success notification
    sendPasswordResetSuccessEmail(user.email).catch((err) =>
      console.error('Failed to send password reset success email:', err.message)
    );

    sendTokenResponse(user, 200, res, 'Password reset successful. You are now logged in.');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};

