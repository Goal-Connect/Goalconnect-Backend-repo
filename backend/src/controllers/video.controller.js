const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const Player = require('../models/Player');
const Academy = require('../models/Academy');
const DrillAnalysis = require('../models/DrillAnalysis');

/**
 * @desc    Get all public videos
 * @route   GET /api/videos
 * @access  Public
 */
const getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { privacy: 'public', processingStatus: 'analyzed' };

    if (req.query.videoType) {
      query.videoType = req.query.videoType;
    }

    if (req.query.playerId) {
      query.player = req.query.playerId;
    }

    const videos = await Video.find(query)
      .populate('player', 'fullName position profileImageUrl')
      .populate('analysis')
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
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single video by ID
 * @route   GET /api/videos/:id
 * @access  Public (with privacy check)
 */
const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('player', 'fullName position academy')
      .populate('analysis')
      .populate('match', 'opponent matchDate');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Check privacy
    if (video.privacy === 'private') {
      // Only owner can view
      const academy = await Academy.findOne({ user: req.user?._id });
      const isOwner = academy && video.player.academy.toString() === academy._id.toString();
      
      if (!isOwner && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'This video is private',
        });
      }
    }

    if (video.privacy === 'scout_only' && (!req.user || !['scout', 'admin'].includes(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: 'This video is only available to scouts',
      });
    }

    // Increment view count
    await video.incrementViews();

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Upload a video for a player
 * @route   POST /api/videos
 * @access  Private (Academy)
 */
const uploadVideo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { playerId, title, description, videoUrl, videoType, drillType, privacy } = req.body;

    // Get academy
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    // Verify player belongs to this academy
    const player = await Player.findOne({
      _id: playerId,
      academy: academy._id,
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found or does not belong to your academy',
      });
    }

    const video = await Video.create({
      player: playerId,
      uploadedBy: req.user._id,
      title,
      description,
      videoUrl,
      videoType,
      drillType,
      privacy: privacy || 'public',
      processingStatus: 'uploaded',
    });

    // TODO: Trigger CV analysis pipeline here
    // For now, we'll mark it as uploaded and the CV module will pick it up

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. It will be processed for analysis.',
      data: video,
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update video metadata
 * @route   PUT /api/videos/:id
 * @access  Private (Academy - owner only)
 */
const updateVideo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const video = await Video.findById(req.params.id).populate('player');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Verify ownership
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy || video.player.academy.toString() !== academy._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video',
      });
    }

    const allowedFields = ['title', 'description', 'privacy', 'drillType'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        video[field] = req.body[field];
      }
    });

    await video.save();

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private (Academy - owner only)
 */
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('player');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Verify ownership
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy || video.player.academy.toString() !== academy._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video',
      });
    }

    // Delete associated analysis
    await DrillAnalysis.deleteOne({ video: video._id });

    // Delete video
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get video feed for mobile app discovery
 * @route   GET /api/videos/feed
 * @access  Public
 */
const getVideoFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get public videos with analyzed status
    const videos = await Video.find({
      privacy: 'public',
      processingStatus: { $in: ['analyzed', 'uploaded'] },
    })
      .populate({
        path: 'player',
        select: 'fullName position dateOfBirth profileImageUrl academy',
        populate: {
          path: 'academy',
          select: 'name region',
        },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Transform to feed format
    const feedItems = videos.map((video) => ({
      _id: video._id,
      video: {
        _id: video._id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        views: video.views || 0,
        processingStatus: video.processingStatus,
        duration: video.duration,
      },
      player: video.player,
      academy: video.player?.academy,
      isSaved: false, // TODO: Check against user's saved list
    }));

    const total = await Video.countDocuments({
      privacy: 'public',
      processingStatus: { $in: ['analyzed', 'uploaded'] },
    });

    res.status(200).json({
      success: true,
      count: feedItems.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: feedItems,
    });
  } catch (error) {
    console.error('Get video feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Increment video view count
 * @route   POST /api/videos/:id/view
 * @access  Public
 */
const incrementVideoView = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.views = (video.views || 0) + 1;
    await video.save();

    res.status(200).json({
      success: true,
      data: { views: video.views },
    });
  } catch (error) {
    console.error('Increment view error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get video analysis
 * @route   GET /api/videos/:id/analysis
 * @access  Public (with privacy check)
 */
const getVideoAnalysis = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const analysis = await DrillAnalysis.findOne({ video: video._id });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not available for this video',
      });
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Get video analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  getVideos,
  getVideo,
  uploadVideo,
  updateVideo,
  deleteVideo,
  getVideoAnalysis,
  getVideoFeed,
  incrementVideoView,
};

