const User = require('../models/User');
const Academy = require('../models/Academy');
const Scout = require('../models/Scout');
const Player = require('../models/Player');
const Video = require('../models/Video');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAcademies,
      pendingAcademies,
      approvedAcademies,
      totalScouts,
      pendingScouts,
      totalPlayers,
      totalVideos,
      analyzedVideos,
    ] = await Promise.all([
      User.countDocuments(),
      Academy.countDocuments(),
      Academy.countDocuments({ registrationStatus: 'awaiting_approval' }),
      Academy.countDocuments({ registrationStatus: 'approved' }),
      Scout.countDocuments(),
      User.countDocuments({ role: 'scout', status: 'pending' }),
      Player.countDocuments({ status: 'active' }),
      Video.countDocuments(),
      Video.countDocuments({ processingStatus: 'analyzed' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
        },
        academies: {
          total: totalAcademies,
          pending: pendingAcademies,
          approved: approvedAcademies,
        },
        scouts: {
          total: totalScouts,
          pending: pendingScouts,
        },
        players: {
          total: totalPlayers,
        },
        videos: {
          total: totalVideos,
          analyzed: analyzedVideos,
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get all academies (including pending)
 * @route   GET /api/admin/academies
 * @access  Private (Admin)
 */
const getAllAcademies = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status) {
      query.registrationStatus = req.query.status;
    }

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const academies = await Academy.find(query)
      .populate('user', 'email status createdAt')
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
    console.error('Get all academies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Approve an academy
 * @route   PUT /api/admin/academies/:id/approve
 * @access  Private (Admin)
 */
const approveAcademy = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id);

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    if (academy.registrationStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Academy is already approved',
      });
    }

    academy.registrationStatus = 'approved';
    academy.approvedAt = new Date();
    academy.approvedBy = req.user._id;
    await academy.save();

    // Update user status
    await User.findByIdAndUpdate(academy.user, { status: 'approved' });

    res.status(200).json({
      success: true,
      message: 'Academy approved successfully',
      data: academy,
    });
  } catch (error) {
    console.error('Approve academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Reject an academy
 * @route   PUT /api/admin/academies/:id/reject
 * @access  Private (Admin)
 */
const rejectAcademy = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const academy = await Academy.findById(req.params.id);

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    academy.registrationStatus = 'rejected';
    academy.rejectionReason = reason;
    await academy.save();

    // Update user status
    await User.findByIdAndUpdate(academy.user, { status: 'rejected' });

    res.status(200).json({
      success: true,
      message: 'Academy rejected',
      data: academy,
    });
  } catch (error) {
    console.error('Reject academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Suspend an academy
 * @route   PUT /api/admin/academies/:id/suspend
 * @access  Private (Admin)
 */
const suspendAcademy = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required',
      });
    }

    const academy = await Academy.findById(req.params.id);

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    academy.registrationStatus = 'suspended';
    academy.suspensionReason = reason;
    await academy.save();

    // Update user status
    await User.findByIdAndUpdate(academy.user, { status: 'suspended' });

    res.status(200).json({
      success: true,
      message: 'Academy suspended',
      data: academy,
    });
  } catch (error) {
    console.error('Suspend academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get all scouts
 * @route   GET /api/admin/scouts
 * @access  Private (Admin)
 */
const getAllScouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const scouts = await Scout.find()
      .populate('user', 'email status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Scout.countDocuments();

    res.status(200).json({
      success: true,
      count: scouts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: scouts,
    });
  } catch (error) {
    console.error('Get all scouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Approve a scout
 * @route   PUT /api/admin/scouts/:id/approve
 * @access  Private (Admin)
 */
const approveScout = async (req, res) => {
  try {
    const scout = await Scout.findById(req.params.id);

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout not found',
      });
    }

    // Update user status
    await User.findByIdAndUpdate(scout.user, { status: 'approved' });

    res.status(200).json({
      success: true,
      message: 'Scout approved successfully',
    });
  } catch (error) {
    console.error('Approve scout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Suspend a scout
 * @route   PUT /api/admin/scouts/:id/suspend
 * @access  Private (Admin)
 */
const suspendScout = async (req, res) => {
  try {
    const scout = await Scout.findById(req.params.id);

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout not found',
      });
    }

    // Update user status
    await User.findByIdAndUpdate(scout.user, { status: 'suspended' });

    res.status(200).json({
      success: true,
      message: 'Scout suspended',
    });
  } catch (error) {
    console.error('Suspend scout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.role) {
      query.role = req.query.role;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getDashboard,
  getAllAcademies,
  approveAcademy,
  rejectAcademy,
  suspendAcademy,
  getAllScouts,
  approveScout,
  suspendScout,
  getAllUsers,
};

