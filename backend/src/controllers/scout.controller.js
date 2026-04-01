const { validationResult } = require('express-validator');
const Scout = require('../models/Scout');
const Player = require('../models/Player');

/**
 * @desc    Get current scout's profile
 * @route   GET /api/scouts/me
 * @access  Private (Scout)
 */
const getMyProfile = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id })
      .populate({
        path: 'savedPlayers',
        select: 'fullName position dateOfBirth profileImageUrl academy',
        populate: {
          path: 'academy',
          select: 'name',
        },
      });

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: scout,
    });
  } catch (error) {
    console.error('Get scout profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update scout profile
 * @route   PUT /api/scouts/me
 * @access  Private (Scout)
 */
const updateMyProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const allowedFields = [
      'fullName',
      'organization',
      'country',
      'phone',
      'profileImageUrl',
      'bio',
      'interestedPositions',
      'preferredAgeRange',
      'preferredRegions',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const scout = await Scout.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: scout,
    });
  } catch (error) {
    console.error('Update scout profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Save a player to favorites
 * @route   POST /api/scouts/saved-players/:playerId
 * @access  Private (Scout)
 */
const savePlayer = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    // Check if already saved
    if (scout.savedPlayers.includes(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Player is already saved',
      });
    }

    await scout.savePlayer(playerId);

    res.status(200).json({
      success: true,
      message: 'Player saved successfully',
    });
  } catch (error) {
    console.error('Save player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Remove a player from favorites
 * @route   DELETE /api/scouts/saved-players/:playerId
 * @access  Private (Scout)
 */
const unsavePlayer = async (req, res) => {
  try {
    const { playerId } = req.params;

    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    await scout.unsavePlayer(playerId);

    res.status(200).json({
      success: true,
      message: 'Player removed from saved list',
    });
  } catch (error) {
    console.error('Unsave player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get saved players
 * @route   GET /api/scouts/saved-players
 * @access  Private (Scout)
 */
const getSavedPlayers = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id })
      .populate({
        path: 'savedPlayers',
        populate: {
          path: 'academy',
          select: 'name region',
        },
      });

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    res.status(200).json({
      success: true,
      count: scout.savedPlayers.length,
      data: scout.savedPlayers,
    });
  } catch (error) {
    console.error('Get saved players error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get recently viewed players
 * @route   GET /api/scouts/recently-viewed
 * @access  Private (Scout)
 */
const getRecentlyViewed = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id })
      .populate({
        path: 'recentlyViewed.player',
        select: 'fullName position dateOfBirth profileImageUrl academy',
        populate: {
          path: 'academy',
          select: 'name',
        },
      });

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: 'Scout profile not found',
      });
    }

    res.status(200).json({
      success: true,
      count: scout.recentlyViewed.length,
      data: scout.recentlyViewed,
    });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  savePlayer,
  unsavePlayer,
  getSavedPlayers,
  getRecentlyViewed,
};

