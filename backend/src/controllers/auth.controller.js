const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Academy = require('../models/Academy');
const Scout = require('../models/Scout');
const Player = require('../models/Player');

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

    // Create user
    const user = await User.create({
      email,
      password,
      role,
      status: 'pending', // Needs admin approval
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

    sendTokenResponse(user, 201, res, 'Registration successful. Your account is pending admin approval.');
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

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
  logout,
};

