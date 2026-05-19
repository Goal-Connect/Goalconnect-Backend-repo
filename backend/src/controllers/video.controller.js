const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const Video = require("../models/Video");
const Player = require("../models/Player");
const Academy = require("../models/Academy");
const DrillAnalysis = require("../models/DrillAnalysis");
const Comment = require("../models/Comment");
const { cloudinary } = require("../middleware/upload.middleware");
const { triggerCVAnalysis } = require("../utils/cv-trigger");
const jwt = require("jsonwebtoken");

const normalizeTrackerAnalytics = (analytics = []) => {
  return analytics
    .map((item) => {
      const trackerIdRaw = Number(item.tracker_id ?? item.trackerId);
      const topSpeedRaw = Number(item.top_speed ?? item.topSpeed ?? 0);
      const distanceRaw = Number(
        item.distance_covered ?? item.distanceCovered ?? 0,
      );
      const thumbnailUrl = item.thumbnail_url ?? item.thumbnailUrl ?? "";
      const heatmapUrl = item.heatmap_url ?? item.heatmapUrl ?? "";

      if (!Number.isInteger(trackerIdRaw) || trackerIdRaw <= 0) {
        return null;
      }

      return {
        trackerId: trackerIdRaw,
        topSpeed:
          Number.isFinite(topSpeedRaw) && topSpeedRaw >= 0 ? topSpeedRaw : 0,
        distanceCovered:
          Number.isFinite(distanceRaw) && distanceRaw >= 0 ? distanceRaw : 0,
        thumbnailUrl: String(thumbnailUrl || ""),
        heatmapUrl: String(heatmapUrl || ""),
      };
    })
    .filter(Boolean);
};

const assertAcademyCanAccessVideo = async (video, userId) => {
  const academy = await Academy.findOne({ user: userId });
  if (!academy) {
    return { academy: null, error: "Academy profile not found" };
  }

  if (video.uploadedBy && video.uploadedBy.toString() === userId.toString()) {
    return { academy, error: null };
  }

  if (!video.player) {
    return {
      academy: null,
      error: "You can only review analytics for your own uploaded videos",
    };
  }

  const player = await Player.findById(video.player).select("academy");
  if (!player || player.academy.toString() !== academy._id.toString()) {
    return {
      academy: null,
      error: "You are not authorized to review analytics for this video",
    };
  }

  return { academy, error: null };
};

const applyTrackerAssignments = async ({ video, assignments, userId }) => {
  if (!Array.isArray(assignments) || !assignments.length) {
    const error = new Error("assignments must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  const analysis = await DrillAnalysis.findOne({ video: video._id });
  if (!analysis) {
    const error = new Error("No analysis found for this video");
    error.statusCode = 404;
    throw error;
  }

  for (const assignment of assignments) {
    const trackerId = Number(assignment.tracker_id ?? assignment.trackerId);
    if (!Number.isInteger(trackerId)) {
      continue;
    }
    const playerId = assignment.player_id ?? assignment.playerId ?? null;
    const row = analysis.trackerAnalytics.find(
      (r) => r.trackerId === trackerId,
    );
    if (row) {
      row.assignedPlayer = playerId || null;
      row.assignedBy = userId;
      row.assignedAt = new Date();
      row.isPublished = true;
    }
  }

  await analysis.save();
  return analysis;
};

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

    const query = {
      privacy: "public",
      processingStatus: { $in: ["analyzed", "uploaded"] },
    };

    if (req.query.videoType) {
      query.videoType = req.query.videoType;
    }

    if (req.query.playerId) {
      query.player = req.query.playerId;
    }

    const videos = await Video.find(query)
      .populate("player", "fullName position profileImageUrl")
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
    console.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get single video by ID with privacy checks
 * @route   GET /api/videos/:id
 * @access  Public (with privacy checks)
 */
const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate("player", "fullName position academy")
      .populate("analysis")
      .populate("match", "opponent matchDate");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check privacy
    if (video.privacy === "private") {
      // Only owner can view
      const academy = await Academy.findOne({ user: req.user?._id });
      const isOwner =
        academy && video.player.academy.toString() === academy._id.toString();

      if (!isOwner && req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "This video is private",
        });
      }
    }

    if (
      video.privacy === "scout_only" &&
      (!req.user || !["scout", "admin"].includes(req.user.role))
    ) {
      return res.status(403).json({
        success: false,
        message: "This video is only available to scouts",
      });
    }

    // Increment view count
    await video.incrementViews();

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const uploadVideoFileOnly = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    res.status(200).json({
      success: true,
      data: req.file.path,
    });
  } catch (error) {
    console.error("Upload video file error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Upload a video (academy or player)
 * @route   POST /api/videos
 * @access  Private (Academy/Player)
 */
const uploadVideo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { title, description, videoType, drillType, privacy, analysisType } =
      req.body;
    let { playerId, videoUrl } = req.body;

    if (!req.file && !videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video file or video URL is required",
      });
    }

    if (req.file) {
      videoUrl = req.file.path; // Cloudinary secure URL from multer
    }

    // Role-based logic
    if (req.user.role === "player") {
      const playerProfile = await Player.findOne({ user: req.user._id });
      if (!playerProfile) {
        return res.status(404).json({
          success: false,
          message: "Player profile not found",
        });
      }
      playerId = playerProfile._id; // Player uploads default to their own profile
    } else if (req.user.role === "academy") {
      const academy = await Academy.findOne({ user: req.user._id });
      if (!academy) {
        return res.status(404).json({
          success: false,
          message: "Academy profile not found",
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
            message: "Player not found or does not belong to your academy",
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role for video upload",
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
      analysisType: analysisType || undefined,
      privacy: privacy || "public",
      status: "approved",
      processingStatus: "uploaded",
      analysisStatus: "UPLOADING",
    });

    // Trigger the CV analysis pipeline (fire-and-forget)
    // Generate a short-lived token the CV service can use for callbacks
    const cvToken = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "4h" },
    );

    triggerCVAnalysis({
      videoId: video._id.toString(),
      videoUrl: video.videoUrl,
      token: cvToken,
      drillId: drillType || "",
    });

    // Move to QUEUED immediately so frontend sees progress
    video.analysisStatus = "QUEUED";
    await video.save();

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully. AI analysis has been queued.",
      data: video,
    });
  } catch (error) {
    console.error("Upload video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const video = await Video.findById(req.params.id).populate("player");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Verify ownership
    if (req.user.role === "admin") {
      // Admins bypass ownership checks
    } else if (req.user.role === "player") {
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this video",
        });
      }
    } else if (req.user.role === "academy") {
      // Academy can update if they uploaded it, or if it belongs to one of their specific players
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        const academy = await Academy.findOne({ user: req.user._id });
        if (
          !academy ||
          !video.player ||
          video.player.academy.toString() !== academy._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update this video",
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const allowedFields = ["title", "description", "privacy", "drillType"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        video[field] = req.body[field];
      }
    });

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
    const video = await Video.findById(req.params.id).populate("player");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Verify ownership
    if (req.user.role === "admin") {
      // Admins bypass checks entirely and can delete anything
    } else if (req.user.role === "player") {
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this video",
        });
      }
    } else if (req.user.role === "academy") {
      // Academy can delete if they uploaded it, or if it belongs to one of their specific players
      if (video.uploadedBy.toString() !== req.user._id.toString()) {
        const academy = await Academy.findOne({ user: req.user._id });
        if (
          !academy ||
          !video.player ||
          video.player.academy.toString() !== academy._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete this video",
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    // Physically delete file from Cloudinary
    if (video.videoUrl && video.videoUrl.includes("cloudinary.com")) {
      try {
        // Typical Cloudinary URL: https://res.cloudinary.com/cloud_name/video/upload/v1/folder_name/filename.mp4
        const parts = video.videoUrl.split("/");
        const fileWithExt = parts[parts.length - 1]; // filename.mp4
        const folder = parts[parts.length - 2]; // goalconnect_videos
        const filename = fileWithExt.split(".")[0]; // filename
        const publicId = `${folder}/${filename}`;

        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        console.log(`Cloudinary file ${publicId} destroyed successfully.`);
      } catch (cloudErr) {
        console.error("Error destroying file on Cloudinary:", cloudErr);
      }
    }

    // Delete associated analysis
    await DrillAnalysis.deleteOne({ video: video._id });

    // Delete video from DB
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
      processingStatus: { $in: ["analyzed", "uploaded"] },
    };

    if (req.user && req.user.role === "admin") {
      // Admins see every video on the platform that is analyzed or uploaded
    } else if (req.user && req.user.role === "academy") {
      // Academy sees all public player videos AND their strictly uploaded videos
      feedQuery.$and = [
        { processingStatus: { $in: ["analyzed", "uploaded"] } },
        {
          $or: [
            { privacy: "public", player: { $exists: true, $ne: null } },
            { uploadedBy: req.user._id },
          ],
        },
      ];
      // remove processingStatus at the top level to avoid MongoDB conflicts with $and
      delete feedQuery.processingStatus;
    } else {
      // Guests / Players / Scouts only see public player-specific videos
      feedQuery.privacy = "public";
      feedQuery.player = { $exists: true, $ne: null };
    }

    const videos = await Video.find(feedQuery)
      .populate({
        path: "player",
        select: "fullName position dateOfBirth profileImageUrl academy",
        populate: {
          path: "academy",
          select: "name region",
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
    console.error("Get video feed error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
        message: "Video not found",
      });
    }

    video.views = (video.views || 0) + 1;
    await video.save();

    res.status(200).json({
      success: true,
      data: { views: video.views },
    });
  } catch (error) {
    console.error("Increment view error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Toggle like on a video
 * @route   POST /api/videos/:id/like
 * @access  Private
 */
const toggleVideoLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const userId = req.user._id.toString();
    const existingIndex = video.likes.findIndex(
      (likeId) => likeId.toString() === userId,
    );

    let message;
    if (existingIndex >= 0) {
      video.likes.splice(existingIndex, 1);
      message = "Video unliked";
    } else {
      video.likes.push(req.user._id);
      message = "Video liked";
    }

    await video.save();

    res.status(200).json({
      success: true,
      message,
      data: {
        likes: video.likes,
        likesCount: video.likes.length,
      },
    });
  } catch (error) {
    console.error("Toggle video like error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get comments for a video
 * @route   GET /api/videos/:id/comments
 * @access  Private
 */
const getVideoComments = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const comments = await Comment.find({
      video: video._id,
      parentComment: null,
    })
      .sort({ createdAt: 1 })
      .populate("user", "fullName profileImageUrl role")
      .populate({
        path: "replies",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "user",
          select: "fullName profileImageUrl role",
        },
      });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    console.error("Get video comments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Add a comment or reply to a video
 * @route   POST /api/videos/:id/comments
 * @access  Private
 */
const addVideoComment = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const parentCommentId = req.body.parentComment || null;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({
        _id: parentCommentId,
        video: video._id,
      });

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    const comment = await Comment.create({
      text,
      user: req.user._id,
      video: video._id,
      parentComment: parentComment ? parentComment._id : null,
    });

    if (parentComment) {
      parentComment.replies.push(comment._id);
      await parentComment.save();
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "fullName profileImageUrl role")
      .populate({
        path: "replies",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "user",
          select: "fullName profileImageUrl role",
        },
      });

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    console.error("Add video comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/videos/:id/comments/:commentId
 * @access  Private
 */
const deleteVideoComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      video: req.params.id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const isOwner = comment.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
    }

    await Comment.deleteOne({ _id: comment._id });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete video comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Toggle like on a comment
 * @route   POST /api/videos/:id/comments/:commentId/like
 * @access  Private
 */
const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      video: req.params.id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const userId = req.user._id.toString();
    const existingIndex = comment.likes.findIndex(
      (likeId) => likeId.toString() === userId,
    );

    let message;
    if (existingIndex >= 0) {
      comment.likes.splice(existingIndex, 1);
      message = "Comment unliked";
    } else {
      comment.likes.push(req.user._id);
      message = "Comment liked";
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message,
      data: {
        likes: comment.likes,
        likesCount: comment.likes.length,
      },
    });
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
        message: "Video not found",
      });
    }

    const analysis = await DrillAnalysis.findOne({ video: video._id });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not available for this video",
      });
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Get video analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Uploads an annotated video to Cloudinary and updates video.annotatedVideoUrl.
 * Accepts either a local /public/... file or a publicly accessible http URL.
 * Returns the Cloudinary secure URL on success, or null if upload is not possible.
 */
async function uploadAnnotatedVideoToCloudinary(video) {
  const annotatedUrl = video.annotatedVideoUrl;
  if (!annotatedUrl) return null;
  if (
    annotatedUrl.includes("cloudinary.com") &&
    annotatedUrl.includes("vc_h264")
  )
    return annotatedUrl;

  const publicRoot = process.env.BACKEND_PUBLIC_DIR
    ? path.resolve(process.env.BACKEND_PUBLIC_DIR)
    : path.join(__dirname, "../../public");

  let uploadSource = null;

  const PUBLIC_MARKER = "/public/";
  const markerIdx = annotatedUrl.indexOf(PUBLIC_MARKER);
  if (markerIdx !== -1) {
    const relPath = annotatedUrl.slice(markerIdx + PUBLIC_MARKER.length);
    const localPath = path.join(publicRoot, relPath);
    if (fs.existsSync(localPath)) uploadSource = localPath;
  }

  if (!uploadSource && annotatedUrl.startsWith("http")) {
    const isLocal =
      annotatedUrl.includes("localhost") ||
      annotatedUrl.includes("127.0.0.1") ||
      /http:\/\/10\./.test(annotatedUrl) ||
      /http:\/\/192\.168\./.test(annotatedUrl);
    if (!isLocal) uploadSource = annotatedUrl;
  }

  if (!uploadSource) return null;

  const result = await cloudinary.uploader.upload(uploadSource, {
    resource_type: "video",
    folder: "goalconnect_annotated_videos",
    public_id: `annotated_${video._id}`,
    overwrite: true,
    chunk_size: 6_000_000,
    eager: [{ format: "mp4", video_codec: "h264", flags: "progressive" }],
    eager_async: false,
  });

  // Use the fully-transcoded H.264 URL from the eager result
  const h264Url = result.eager?.[0]?.secure_url || result.secure_url;

  video.annotatedVideoUrl = h264Url;
  await video.save();
  return h264Url;
}

/**
 * Downloads a URL to an in-memory Buffer (works for localhost URLs from same machine).
 */
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Uploads a single image URL to Cloudinary.
 * Handles: backend /public/ paths, any http URL (including CV service localhost).
 */
async function uploadImageToCloudinary(imageUrl, publicId) {
  if (!imageUrl || imageUrl.includes("cloudinary.com")) return imageUrl;

  const publicRoot = process.env.BACKEND_PUBLIC_DIR
    ? path.resolve(process.env.BACKEND_PUBLIC_DIR)
    : path.join(__dirname, "../../public");

  // Try local file first
  const PUBLIC_MARKER = "/public/";
  const markerIdx = imageUrl.indexOf(PUBLIC_MARKER);
  if (markerIdx !== -1) {
    const relPath = imageUrl.slice(markerIdx + PUBLIC_MARKER.length);
    const localPath = path.join(publicRoot, relPath);
    if (fs.existsSync(localPath)) {
      const result = await cloudinary.uploader.upload(localPath, {
        resource_type: "image",
        folder: "goalconnect_analytics",
        public_id: publicId,
        overwrite: true,
      });
      return result.secure_url;
    }
  }

  // Download from any http URL (including same-machine CV service localhost)
  if (imageUrl.startsWith("http")) {
    const buffer = await downloadToBuffer(imageUrl);
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "goalconnect_analytics",
          public_id: publicId,
          overwrite: true,
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  return null;
}

/**
 * Uploads all tracker thumbnail and heatmap images to Cloudinary in the background.
 */
async function uploadTrackingImagesToCloudinary(analysis) {
  const rows = analysis?.trackerAnalytics;
  if (!rows?.length) return;

  let changed = false;

  for (const row of rows) {
    if (row.thumbnailUrl && !row.thumbnailUrl.includes("cloudinary.com")) {
      try {
        const cdnUrl = await uploadImageToCloudinary(
          row.thumbnailUrl,
          `thumb_${analysis.video}_${row.trackerId}`,
        );
        if (cdnUrl) {
          row.thumbnailUrl = cdnUrl;
          changed = true;
        }
      } catch (e) {
        console.warn(
          `[BG] thumb upload failed for tracker ${row.trackerId}: ${e.message}`,
        );
      }
    }

    if (row.heatmapUrl && !row.heatmapUrl.includes("cloudinary.com")) {
      try {
        const cdnUrl = await uploadImageToCloudinary(
          row.heatmapUrl,
          `heat_${analysis.video}_${row.trackerId}`,
        );
        if (cdnUrl) {
          row.heatmapUrl = cdnUrl;
          changed = true;
        }
      } catch (e) {
        console.warn(
          `[BG] heatmap upload failed for tracker ${row.trackerId}: ${e.message}`,
        );
      }
    }
  }

  if (changed) {
    analysis.markModified("trackerAnalytics");
    await analysis.save();
    console.log(
      `[BG] Tracking images uploaded to Cloudinary for analysis ${analysis._id}`,
    );
  }
}

/**
 * @desc    Auto-create tracker analytics from CV pipeline output
 * @route   POST /api/videos/:id/tracker-analytics
 * @access  Private (Academy/Admin)
 */
const upsertTrackerAnalytics = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    let academy = null;
    if (req.user.role === "academy") {
      const access = await assertAcademyCanAccessVideo(video, req.user._id);
      if (access.error) {
        return res.status(403).json({
          success: false,
          message: access.error,
        });
      }
      academy = access.academy;
    }

    const {
      analytics,
      trackingData,
      drillId,
      annotated_video_url,
      annotatedVideoUrl: camelAnnotated,
    } = req.body;
    const analyticsPayload =
      Array.isArray(trackingData) && trackingData.length
        ? trackingData
        : analytics;
    const normalizedAnalytics = normalizeTrackerAnalytics(analyticsPayload);
    if (!normalizedAnalytics.length) {
      return res.status(400).json({
        success: false,
        message: "analytics must contain at least one valid tracker row",
      });
    }
    const annotatedVideoUrl = annotated_video_url || camelAnnotated || "";

    const existing = await DrillAnalysis.findOne({ video: video._id });
    const existingByTrackerId = new Map(
      (existing?.trackerAnalytics || []).map((row) => [row.trackerId, row]),
    );

    const mergedTrackerAnalytics = normalizedAnalytics.map((row) => {
      const previous = existingByTrackerId.get(row.trackerId);
      if (!previous) {
        return row;
      }

      return {
        ...row,
        assignedPlayer: previous.assignedPlayer,
        assignedBy: previous.assignedBy,
        assignedAt: previous.assignedAt,
        isPublished: previous.isPublished,
        heatmapUrl: row.heatmapUrl || previous.heatmapUrl,
      };
    });

    const analysisData = {
      video: video._id,
      player: video.player || null,
      drillId: drillId || null,
      trackerAnalytics: mergedTrackerAnalytics,
      analysisVersion: "1.0",
      processingTime: 0, // This would be set by the actual CV processing
    };

    const analysis = existing
      ? Object.assign(existing, analysisData)
      : new DrillAnalysis(analysisData);

    await analysis.save();

    // Update video processing status
    video.processingStatus = "analyzed";
    video.analysisReady = true;
    video.analysisStatus = "READY_FOR_REVIEW";
    if (annotatedVideoUrl) {
      video.annotatedVideoUrl = annotatedVideoUrl;
    }
    video.processingError = null;
    await video.save();

    // Kick off Cloudinary uploads in the background — don't block the response
    setImmediate(async () => {
      try {
        if (annotatedVideoUrl) {
          const cdnUrl = await uploadAnnotatedVideoToCloudinary(video);
          if (cdnUrl)
            console.log(`[BG] Annotated video → Cloudinary: ${cdnUrl}`);
        }
      } catch (err) {
        console.error(
          "[BG] Annotated video Cloudinary upload failed:",
          err.message,
        );
      }

      try {
        const freshAnalysis = await DrillAnalysis.findOne({ video: video._id });
        if (freshAnalysis)
          await uploadTrackingImagesToCloudinary(freshAnalysis);
      } catch (err) {
        console.error(
          "[BG] Tracking images Cloudinary upload failed:",
          err.message,
        );
      }
    });

    res.status(200).json({
      success: true,
      message: "Tracker analytics auto-created successfully",
      data: {
        videoId: video._id,
        analysisId: analysis._id,
        drillId: analysis.drillId || null,
        trackerCount: analysis.trackerAnalytics.length,
        reviewUrl: `/api/videos/${video._id}/tracker-analytics/review`,
      },
    });
  } catch (error) {
    console.error("Auto-create tracker analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during auto-creation",
    });
  }
};

/**
 * @desc    Get tracker analytics review data (HITL mapping dashboard)
 * @route   GET /api/analysis/review/:id
 * @access  Private (Academy/Admin)
 */
const getTrackerAnalyticsReview = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate(
      "player",
      "academy",
    );
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (req.user.role === "academy") {
      const access = await assertAcademyCanAccessVideo(video, req.user._id);
      if (access.error) {
        return res.status(403).json({ success: false, message: access.error });
      }
    }

    const analysis = await DrillAnalysis.findOne({ video: video._id }).populate(
      "trackerAnalytics.assignedPlayer",
      "fullName jerseyNumber position profileImageUrl",
    );

    const academy =
      req.user.role === "academy"
        ? await Academy.findOne({ user: req.user._id })
        : null;

    const roster = academy
      ? await Player.find({ academy: academy._id }).select(
          "fullName jerseyNumber position profileImageUrl",
        )
      : [];

    const trackingRows = (analysis?.trackerAnalytics || []).map((row) => ({
      tracker_id: row.trackerId,
      peak_speed:
        typeof row.topSpeed === "number"
          ? `${row.topSpeed.toFixed(2)} km/h`
          : "—",
      distance_covered:
        typeof row.distanceCovered === "number"
          ? `${row.distanceCovered.toFixed(2)} m`
          : "—",
      thumbnail_url: row.thumbnailUrl,
      heatmap_url: row.heatmapUrl || null,
      player_id: row.assignedPlayer?._id || null,
      player_name: row.assignedPlayer?.fullName || null,
      is_published: !!row.isPublished,
    }));

    res.status(200).json({
      success: true,
      data: {
        videoId: video._id,
        drillId: analysis?.drillId || null,
        annotatedVideoUrl: video.annotatedVideoUrl || null,
        trackingData: trackingRows,
        analytics: trackingRows,
        roster,
      },
    });
  } catch (error) {
    console.error("Get tracker analytics review error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Assign players to tracker analytics rows and publish stats
 * @route   POST /api/videos/:id/tracker-analytics/assign
 * @access  Private (Academy/Admin)
 */
const assignTrackerAnalytics = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (req.user.role === "academy") {
      const access = await assertAcademyCanAccessVideo(video, req.user._id);
      if (access.error) {
        return res.status(403).json({ success: false, message: access.error });
      }
    }

    const assignments = Array.isArray(req.body.assignments)
      ? req.body.assignments
      : [];

    await applyTrackerAssignments({ video, assignments, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: "Stats published to player profiles",
    });
  } catch (error) {
    console.error("Assign tracker analytics error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * @desc    Batch-verify tracker-to-player assignments
 * @route   POST /api/analysis/verify-batch
 * @access  Private (Academy/Admin)
 */
const verifyTrackerAnalyticsBatch = async (req, res) => {
  try {
    const { videoId, assignments } = req.body || {};
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res
        .status(400)
        .json({ success: false, message: "videoId is required" });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (req.user.role === "academy") {
      const access = await assertAcademyCanAccessVideo(video, req.user._id);
      if (access.error) {
        return res.status(403).json({ success: false, message: access.error });
      }
    }

    await applyTrackerAssignments({ video, assignments, userId: req.user._id });

    res
      .status(200)
      .json({ success: true, message: "Metrics verified and published" });
  } catch (error) {
    console.error("Verify tracker analytics batch error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/**
 * @desc    Update analysis status (callback from CV service)
 * @route   PUT /api/videos/:id/analysis-status
 * @access  Private (authenticated via CV token)
 */
const updateAnalysisStatus = async (req, res) => {
  try {
    const { analysisStatus } = req.body;
    const validStatuses = [
      "UPLOADING",
      "QUEUED",
      "TRACKING_OBJECTS",
      "GENERATING_METRICS",
      "READY_FOR_REVIEW",
      "FAILED",
    ];
    if (!analysisStatus || !validStatuses.includes(analysisStatus)) {
      return res.status(400).json({
        success: false,
        message: `analysisStatus must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (
      analysisStatus === "TRACKING_OBJECTS" ||
      analysisStatus === "GENERATING_METRICS"
    ) {
      video.processingStatus = "processing";
    }
    if (analysisStatus === "FAILED") {
      video.processingStatus = "failed";
      video.processingError =
        req.body.processingError || "CV processing failed";
    }

    video.analysisStatus = analysisStatus;
    await video.save();

    res.status(200).json({
      success: true,
      message: `Analysis status updated to ${analysisStatus}`,
    });
  } catch (error) {
    console.error("Update analysis status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Get real-time analysis status for polling
 * @route   GET /api/videos/:id/analysis-status
 * @access  Private (Academy/Admin)
 */
const getAnalysisStatus = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).select(
      "title analysisStatus processingStatus analysisReady analysisType processingError",
    );
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    res.status(200).json({
      success: true,
      data: {
        videoId: video._id,
        title: video.title,
        analysisStatus: video.analysisStatus || "UPLOADING",
        processingStatus: video.processingStatus,
        processingError: video.processingError || null,
        analysisReady: video.analysisReady || false,
        analysisType: video.analysisType || null,
      },
    });
  } catch (error) {
    console.error("Get analysis status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Upload the annotated video to Cloudinary for browser playback
 * @route   POST /api/analysis/convert-video/:id
 * @access  Private (Academy/Admin)
 */
const convertAnnotatedVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (req.user.role === "academy") {
      const access = await assertAcademyCanAccessVideo(video, req.user._id);
      if (access.error) {
        return res.status(403).json({ success: false, message: access.error });
      }
    }

    if (!video.annotatedVideoUrl) {
      return res.status(400).json({
        success: false,
        message: "No annotated video URL on this video",
      });
    }

    if (
      video.annotatedVideoUrl.includes("cloudinary.com") &&
      video.annotatedVideoUrl.includes("vc_h264")
    ) {
      return res.json({
        success: true,
        message: "Video is already hosted on Cloudinary as H.264",
        data: { annotatedVideoUrl: video.annotatedVideoUrl },
      });
    }

    const cdnUrl = await uploadAnnotatedVideoToCloudinary(video);
    if (!cdnUrl) {
      return res.status(422).json({
        success: false,
        message:
          "Cannot reach the video file from this server. " +
          "Ensure BACKEND_PUBLIC_DIR is set so the CV pipeline publishes the file here, " +
          "or re-run the CV pipeline.",
      });
    }

    return res.json({
      success: true,
      message: "Annotated video uploaded to Cloudinary",
      data: { annotatedVideoUrl: cdnUrl },
    });
  } catch (error) {
    console.error("Upload annotated video to Cloudinary error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Upload failed" });
  }
};

module.exports = {
  getVideos,
  getVideo,
  uploadVideo,
  uploadVideoFileOnly,
  updateVideo,
  deleteVideo,
  getVideoAnalysis,
  upsertTrackerAnalytics,
  getTrackerAnalyticsReview,
  assignTrackerAnalytics,
  verifyTrackerAnalyticsBatch,
  convertAnnotatedVideo,
  getVideoFeed,
  incrementVideoView,
  toggleVideoLike,
  getVideoComments,
  addVideoComment,
  deleteVideoComment,
  toggleCommentLike,
  getAnalysisStatus,
  updateAnalysisStatus,
};
