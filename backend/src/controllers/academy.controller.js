const { validationResult } = require('express-validator');
const Academy = require('../models/Academy');
const Player = require('../models/Player');

/**
 * @desc    Get all approved academies
 * @route   GET /api/academies
 * @access  Public
 */
const getAcademies = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { registrationStatus: 'approved' };

    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Filter by region
    if (req.query.region) {
      query.region = req.query.region;
    }

    const academies = await Academy.find(query)
      .populate('playerCount')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Academy.countDocuments(query);

    res.status(200).json({
      success: true,
      count: academies.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: academies,
    });
  } catch (error) {
    console.error('Get academies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single academy by ID
 * @route   GET /api/academies/:id
 * @access  Public
 */
const getAcademy = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id)
      .populate('playerCount')
      .populate({
        path: 'players',
        match: { status: 'active' },
        select: 'fullName position dateOfBirth profileImageUrl',
      });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    // Only show approved academies to public
    if (academy.registrationStatus !== 'approved' && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    res.status(200).json({
      success: true,
      data: academy,
    });
  } catch (error) {
    console.error('Get academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get current academy's profile
 * @route   GET /api/academies/me
 * @access  Private (Academy)
 */
const getMyAcademy = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id })
      .populate('playerCount');

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: academy,
    });
  } catch (error) {
    console.error('Get my academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update academy profile
 * @route   PUT /api/academies/me
 * @access  Private (Academy)
 */
const updateMyAcademy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Fields that can be updated
    const allowedFields = [
      'name',
      'region',
      'woreda',
      'address',
      'ownerName',
      'foundingDate',
      'contactPhone',
      'description',
      'logoUrl',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const academy = await Academy.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Academy profile updated successfully',
      data: academy,
    });
  } catch (error) {
    console.error('Update academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get academy's players
 * @route   GET /api/academies/me/players
 * @access  Private (Academy)
 */
const getMyPlayers = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { academy: academy._id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by position
    if (req.query.position) {
      query.position = req.query.position;
    }

    const players = await Player.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Player.countDocuments(query);

    res.status(200).json({
      success: true,
      count: players.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: players,
    });
  } catch (error) {
    console.error('Get my players error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Upload license document
 * @route   POST /api/academies/me/license
 * @access  Private (Academy)
 */
const uploadLicense = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const academy = await Academy.findOneAndUpdate(
      { user: req.user._id },
      { licenseDocumentUrl: req.file.path },
      { new: true }
    );

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'License document uploaded successfully',
      data: { licenseDocumentUrl: academy.licenseDocumentUrl },
    });
  } catch (error) {
    console.error('Upload license error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getAcademies,
  getAcademy,
  getMyAcademy,
  updateMyAcademy,
  getMyPlayers,
  uploadLicense,
};

