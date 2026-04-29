const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const Player = require('../models/Player');
const Academy = require('../models/Academy');
const DrillAnalysis = require('../models/DrillAnalysis');
const Comment = require('../models/Comment');
const { cloudinary } = require('../middleware/upload.middleware');

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

    const { title, description, videoType, drillType, privacy } = req.body;
    let { playerId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required',
      });
    }
    const videoUrl = req.file.path; // Cloudinary secure URL from multer

    // Role-based logic
    if (req.user.role === 'player') {
      const playerProfile = await Player.findOne({ user: req.user._id });
      if (!playerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
        });
      }
      playerId = playerProfile._id; // Player uploads default to their own profile
    } else if (req.user.role === 'academy') {
      const academy = await Academy.findOne({ user: req.user._id });
      if (!academy) {
        return res.status(404).json({
          success: false,
          message: 'Academy profile not found',
        });
      }

      // If academy specifies a player, verify ownership
      if (playerId) {
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
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized role for video upload',
      });
    }

    const video = await Video.create({
      player: playerId || undefined,
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
    if (req.user.role === 'admin') {
      // Admins bypass ownership checks
    } else if (req.user.role === 'player') {
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this video',
        });
      }
    } else if (req.user.role === 'academy') {
      // Academy can update if they uploaded it, or if it belongs to one of their specific players
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        const academy = await Academy.findOne({ user: req.user._id });
        if (!academy || !video.player || video.player.academy.toString() !== academy._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this video',
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized role',
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
 * @access  Private (Owner only)
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
    if (req.user.role === 'admin') {
      // Admins bypass checks entirely and can delete anything
    } else if (req.user.role === 'player') {
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this video',
        });
      }
    } else if (req.user.role === 'academy') {
      // Academy can delete if they uploaded it, or if it belongs to one of their specific players
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        const academy = await Academy.findOne({ user: req.user._id });
        if (!academy || !video.player || video.player.academy.toString() !== academy._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this video',
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized role',
      });
    }

    // Physically delete file from Cloudinary 
    if (video.videoUrl && video.videoUrl.includes('cloudinary.com')) {
      try {
        // Typical Cloudinary URL: https://res.cloudinary.com/cloud_name/video/upload/v1/folder_name/filename.mp4
        const parts = video.videoUrl.split('/');
        const fileWithExt = parts[parts.length - 1];               // filename.mp4
        const folder = parts[parts.length - 2];                    // goalconnect_videos
        const filename = fileWithExt.split('.')[0];                 // filename
        const publicId = `${folder}/${filename}`;
        
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        console.log(`Cloudinary file ${publicId} destroyed successfully.`);
      } catch (cloudErr) {
        console.error('Error destroying file on Cloudinary:', cloudErr);
      }
    }

    // Delete associated analysis
    await DrillAnalysis.deleteOne({ video: video._id });

    // Delete video from DB
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

    // Smart visibility engine based on role
    let feedQuery = {
      processingStatus: { $in: ['analyzed', 'uploaded'] }
    };

    if (req.user && req.user.role === 'admin') {
      // Admins see every video on the platform that is analyzed or uploaded
    } else if (req.user && req.user.role === 'academy') {
      // Academy sees all public player videos AND their strictly uploaded videos
      feedQuery.$and = [
        { processingStatus: { $in: ['analyzed', 'uploaded'] } },
        {
          $or: [
            { privacy: 'public', player: { $exists: true, $ne: null } },
            { uploadedBy: req.user._id }
          ]
        }
      ];
      // remove processingStatus at the top level to avoid MongoDB conflicts with $and
      delete feedQuery.processingStatus;
    } else {
      // Guests / Players / Scouts only see public player-specific videos
      feedQuery.privacy = 'public';
      feedQuery.player = { $exists: true, $ne: null };
    }

    const videos = await Video.find(feedQuery)
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
        description: video.description,
        privacy: video.privacy,
        uploadedBy: video.uploadedBy,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        views: video.views || 0,
        likes: video.likes || [],
        processingStatus: video.processingStatus,
        duration: video.duration,
      },
      player: video.player,
      academy: video.player?.academy,
      isSaved: false, // TODO: Check against user's saved list
    }));

    const total = await Video.countDocuments(feedQuery);

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

/**
 * @desc    Toggle like on a video
 * @route   POST /api/videos/:id/like
 * @access  Private
 */
const toggleLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const userId = req.user._id;
    const isLiked = video.likes.includes(userId);

    if (isLiked) {
      // Remove like
      video.likes = video.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Add like
      video.likes.push(userId);
    }

    await video.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Video unliked' : 'Video liked',
      data: {
        likes: video.likes,
        likesCount: video.likes.length
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get comments for a video
 * @route   GET /api/videos/:id/comments
 * @access  Public (with privacy check)
 */
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ video: req.params.id, parentComment: null })
      .populate('user', 'fullName profileImageUrl role')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'fullName profileImageUrl role' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Add a comment to a video
 * @route   POST /api/videos/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  try {
    const { text, parentComment } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    let parent = null;
    if (parentComment) {
      parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }
    }

    const comment = await Comment.create({
      text: text.trim(),
      user: req.user._id,
      video: video._id,
      parentComment: parent ? parent._id : null
    });

    if (parent) {
      parent.replies.push(comment._id);
      await parent.save();
    }

    await comment.populate('user', 'fullName profileImageUrl role');

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/videos/:id/comments/:commentId
 * @access  Private
 */
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check ownership or admin
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Toggle like on a comment
 * @route   POST /api/videos/:id/comments/:commentId/like
 * @access  Private
 */
const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id;
    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      data: {
        likes: comment.likes,
        likesCount: comment.likes.length
      }
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
};

