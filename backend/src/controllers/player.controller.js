const { validationResult } = require("express-validator");
const Player = require("../models/Player");
const Academy = require("../models/Academy");
const Video = require("../models/Video");
const Scout = require("../models/Scout");
const User = require("../models/User");
const { sendPlayerAccountCreationEmail } = require("../utils/email");

/**
 * @desc    Get all players with filtering and pagination
 * @route   GET /api/players
 * @access  Public
 */
const getPlayers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Build query - only active players from approved academies
    const query = { status: "active" };

    // Filter by position
    if (req.query.position) {
      query.position = req.query.position;
    }

    // Filter by strong foot
    if (req.query.strongFoot) {
      query.strongFoot = req.query.strongFoot;
    }

    // Filter by age range
    if (req.query.minAge || req.query.maxAge) {
      const today = new Date();
      if (req.query.maxAge) {
        const minDate = new Date(
          today.getFullYear() - parseInt(req.query.maxAge) - 1,
          today.getMonth(),
          today.getDate(),
        );
        query.dateOfBirth = { ...query.dateOfBirth, $gte: minDate };
      }
      if (req.query.minAge) {
        const maxDate = new Date(
          today.getFullYear() - parseInt(req.query.minAge),
          today.getMonth(),
          today.getDate(),
        );
        query.dateOfBirth = { ...query.dateOfBirth, $lte: maxDate };
      }
    }

    // Filter by height range
    if (req.query.minHeight) {
      query.height = { ...query.height, $gte: parseInt(req.query.minHeight) };
    }
    if (req.query.maxHeight) {
      query.height = { ...query.height, $lte: parseInt(req.query.maxHeight) };
    }

    // Search by name
    if (req.query.search) {
      query.fullName = { $regex: req.query.search, $options: "i" };
    }

    // Build sort
    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
      sort = { [sortField]: sortOrder };
    }

    const players = await Player.find(query)
      .populate("academy", "name region")
      .skip(skip)
      .limit(limit)
      .sort(sort);

    const total = await Player.countDocuments(query);

    // If user is a scout, track recently viewed
    if (req.user && req.user.role === "scout") {
      // This is handled in getPlayer for individual views
    }

    res.status(200).json({
      success: true,
      count: players.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: players,
    });
  } catch (error) {
    console.error("Get players error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get single player by ID
 * @route   GET /api/players/:id
 * @access  Public
 */
const getPlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate("academy", "name region logoUrl")
      .populate({
        path: "videos",
        match: { privacy: "public", processingStatus: "analyzed" },
        select: "title thumbnailUrl videoType duration views createdAt",
        options: { sort: { createdAt: -1 }, limit: 10 },
      });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    // Track view if user is a scout
    if (req.user && req.user.role === "scout") {
      const scout = await Scout.findOne({ user: req.user._id });
      if (scout) {
        await scout.addToRecentlyViewed(player._id);
      }
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    console.error("Get player error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Create a new player (by Academy)
 * @route   POST /api/players
 * @access  Private (Academy)
 */
const createPlayer = async (req, res) => {
  let playerUser;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    // Get academy
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res.status(404).json({
        success: false,
        message: "Academy profile not found",
      });
    }

    // Check if academy is approved
    if (academy.registrationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your academy must be approved before adding players",
      });
    }

    const { email, password, ...playerBody } = req.body;
    const primaryPosition = playerBody.primaryPosition || playerBody.position;

    if (!primaryPosition) {
      return res.status(400).json({
        success: false,
        message: "Primary position is required",
      });
    }

    // Ensure email is not already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Create a login account for the player
    playerUser = await User.create({
      email,
      password,
      role: "player",
      status: "approved",
    });

    const playerData = {
      ...playerBody,
      position: primaryPosition,
      primaryPosition,
      secondaryPosition: playerBody.secondaryPosition,
      clubHistory: playerBody.clubHistory || [],
      playingStyleTags: playerBody.playingStyleTags || [],
      technicalStrengths: playerBody.technicalStrengths,
      technicalWeaknesses: playerBody.technicalWeaknesses,
      availabilityStatus: playerBody.availabilityStatus || "Available",
      birthCertificateUrl: playerBody.birthCertificateUrl,
      passportUrl: playerBody.passportUrl,
      isAgeVerified: playerBody.isAgeVerified || false,
      academy: academy._id,
      user: playerUser._id,
      verificationStatus: "verified", // Auto-verified when created by academy
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    };

    const player = await Player.create(playerData);

    // Send the player a welcome email with their credentials — non-blocking
    sendPlayerAccountCreationEmail(
      email, 
      playerBody.fullName || 'Player', 
      academy.name, 
      password
    ).catch(err => 
      console.error('Failed to send player creation email:', err.message)
    );

    res.status(201).json({
      success: true,
      message: "Player created successfully",
      data: player,
    });
  } catch (error) {
    console.error("Create player error:", error);
    // Roll back created user if player creation fails
    if (playerUser) {
      try {
        await User.findByIdAndDelete(playerUser._id);
      } catch (cleanupError) {
        console.error("Failed to roll back player user:", cleanupError);
      }
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Update player (by Academy)
 * @route   PUT /api/players/:id
 * @access  Private (Academy)
 */
const updatePlayer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    // Get academy
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res.status(404).json({
        success: false,
        message: "Academy profile not found",
      });
    }

    // Find player and verify ownership
    const player = await Player.findOne({
      _id: req.params.id,
      academy: academy._id,
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found or you do not have permission to update",
      });
    }

    // Fields that can be updated
    const allowedFields = [
      "fullName",
      "dateOfBirth",
      "position",
      "primaryPosition",
      "secondaryPosition",
      "strongFoot",
      "height",
      "weight",
      "jerseyNumber",
      "profileImageUrl",
      "bio",
      "clubHistory",
      "playingStyleTags",
      "technicalStrengths",
      "technicalWeaknesses",
      "availabilityStatus",
      "birthCertificateUrl",
      "passportUrl",
      "isAgeVerified",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        player[field] = req.body[field];
      }
    });

    if (req.body.primaryPosition && !req.body.position) {
      player.position = req.body.primaryPosition;
    }

    if (req.body.position && !req.body.primaryPosition) {
      player.primaryPosition = req.body.position;
    }

    await player.save();

    res.status(200).json({
      success: true,
      message: "Player updated successfully",
      data: player,
    });
  } catch (error) {
    console.error("Update player error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Delete/Archive player (by Academy)
 * @route   DELETE /api/players/:id
 * @access  Private (Academy)
 */
const deletePlayer = async (req, res) => {
  try {
    // Get academy
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res.status(404).json({
        success: false,
        message: "Academy profile not found",
      });
    }

    // Find player and verify ownership
    const player = await Player.findOne({
      _id: req.params.id,
      academy: academy._id,
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found or you do not have permission to delete",
      });
    }

    // Soft delete - archive instead of removing
    player.status = "archived";
    await player.save();

    res.status(200).json({
      success: true,
      message: "Player archived successfully",
    });
  } catch (error) {
    console.error("Delete player error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get player's videos
 * @route   GET /api/players/:id/videos
 * @access  Public (with privacy filtering)
 */
const getPlayerVideos = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build privacy query based on user role
    const query = { player: player._id };

    if (!req.user) {
      query.privacy = "public";
    } else if (req.user.role === "scout") {
      query.privacy = { $in: ["public", "scout_only"] };
    }
    // Academy owners can see all their player's videos

    if (req.query.videoType) {
      query.videoType = req.query.videoType;
    }

    const videos = await Video.find(query)
      .populate("analysis")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: videos,
    });
  } catch (error) {
    console.error("Get player videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Save a player to scout's watchlist
 * @route   POST /api/players/:id/save
 * @access  Private (Scout)
 */
const savePlayer = async (req, res) => {
  try {
    const playerId = req.params.id;

    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({
        success: false,
        message: "Scout profile not found",
      });
    }

    // Check if already saved
    if (scout.savedPlayers.includes(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Player is already saved",
      });
    }

    await scout.savePlayer(playerId);

    res.status(200).json({
      success: true,
      message: "Player saved to watchlist",
    });
  } catch (error) {
    console.error("Save player error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Remove a player from scout's watchlist
 * @route   DELETE /api/players/:id/save
 * @access  Private (Scout)
 */
const unsavePlayer = async (req, res) => {
  try {
    const playerId = req.params.id;

    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({
        success: false,
        message: "Scout profile not found",
      });
    }

    await scout.unsavePlayer(playerId);

    res.status(200).json({
      success: true,
      message: "Player removed from watchlist",
    });
  } catch (error) {
    console.error("Unsave player error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get scout's saved players
 * @route   GET /api/players/saved
 * @access  Private (Scout)
 */
const getSavedPlayers = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id }).populate({
      path: "savedPlayers",
      populate: {
        path: "academy",
        select: "name region",
      },
    });

    if (!scout) {
      return res.status(404).json({
        success: false,
        message: "Scout profile not found",
      });
    }

    res.status(200).json({
      success: true,
      count: scout.savedPlayers.length,
      data: scout.savedPlayers,
    });
  } catch (error) {
    console.error("Get saved players error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerVideos,
  savePlayer,
  unsavePlayer,
  getSavedPlayers,
};
