const Report = require("../models/Report");
const Video = require("../models/Video");
const Player = require("../models/Player");
const Notification = require("../models/Notification");
const Academy = require("../models/Academy");

/**
 * @desc Create a report (scouts)
 * @route POST /api/reports
 * @access Private (scout)
 */
const createReport = async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      reason,
      description,
      evidenceLink,
      reportType,
    } = req.body;

    if (!targetType || !targetId || !reason) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Determine routing based on reportType
    let routedTo = "admin";
    let routedToAcademy = undefined;
    const resolvedReportType = reportType || "OTHER";

    if (resolvedReportType === "VIDEO_VIOLATION" && targetType === "video") {
      // Route to the academy that owns the video's player
      const video = await Video.findById(targetId).populate(
        "player",
        "academy",
      );
      if (video?.player?.academy) {
        const academy = await Academy.findById(video.player.academy);
        if (academy) {
          routedTo = "academy";
          routedToAcademy = academy._id;

          // Notify the academy
          try {
            await Notification.create({
              userId: academy.user,
              type: "report_received",
              message: `A video in your academy has been flagged for a community guideline violation. Please review it in your Moderation Inbox.`,
              metadata: { videoId: targetId, reportReason: reason },
            });
          } catch (e) {
            console.error("Academy notification error:", e);
          }
        }
      }
    } else if (resolvedReportType === "AGE_VERIFICATION") {
      // Always route age verification fraud to Admin
      routedTo = "admin";
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      targetType,
      targetId,
      reason,
      description,
      reportType: resolvedReportType,
      routedTo,
      routedToAcademy,
      metadata: evidenceLink ? { evidenceLink } : undefined,
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Get reports (admin)
 * @route GET /api/admin/reports
 * @access Private (admin)
 */
const getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.targetType) query.targetType = req.query.targetType;

    const reports = await Report.find(query)
      .populate("reportedBy", "email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Populate target data (video or player) for each report
    const reportsWithTargets = await Promise.all(
      reports.map(async (report) => {
        const reportObj = report.toObject();

        if (report.targetType === "video") {
          const video = await Video.findById(report.targetId)
            .populate("player", "fullName profileImageUrl")
            .select("_id title videoUrl thumbnail duration player uploadedAt");
          reportObj.targetData = video;
        } else if (report.targetType === "player") {
          const player = await Player.findById(report.targetId)
            .populate("academy", "name")
            .select(
              "_id fullName profileImageUrl dateOfBirth academy isAgeVerified",
            );
          reportObj.targetData = player;
        }

        return reportObj;
      }),
    );

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reportsWithTargets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: reportsWithTargets,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Review a report and optionally take action (admin)
 * @route PUT /api/admin/reports/:id/review
 * @access Private (admin)
 */
const reviewReport = async (req, res) => {
  try {
    const { action, resolution, takedownReason } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report)
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });

    // Perform action based on action string
    if (action === "takedown_video" && report.targetType === "video") {
      const video = await Video.findById(report.targetId);
      if (video) {
        video.status = "rejected";
        video.privacy = "private";
        video.moderationNote =
          takedownReason || resolution || "Taken down by admin after report";
        await video.save();

        // notify uploader
        try {
          await Notification.create({
            userId: video.uploadedBy,
            type: "video_takedown_warning",
            message: `A video you uploaded was taken down: ${video.title || ""}`,
            metadata: { videoId: video._id, senderId: req.user._id },
          });
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    }

    if (
      action === "revoke_player_verification" &&
      report.targetType === "player"
    ) {
      const player = await Player.findById(report.targetId).populate("academy");
      if (player) {
        player.isAgeVerified = false;
        player.verificationStatus = "pending";
        player.verifiedAt = undefined;
        player.verifiedBy = undefined;
        await player.save();

        // notify academy (if exists)
        try {
          if (player.academy && player.academy.user) {
            await Notification.create({
              userId: player.academy.user,
              type: "general",
              message: `Player ${player.fullName} had their verification revoked due to an age document report. Please review and re-submit verification.`,
              metadata: {
                playerId: player._id,
                academyId: player.academy._id,
                senderId: req.user._id,
              },
            });
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    }

    report.status = "resolved";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.resolution = resolution || action;
    await report.save();

    res
      .status(200)
      .json({ success: true, message: "Report reviewed", data: report });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Get reports routed to the requesting academy's moderation inbox
 * @route GET /api/academy/moderation
 * @access Private (academy)
 */
const getAcademyModerationInbox = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res
        .status(404)
        .json({ success: false, message: "Academy not found" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { routedTo: "academy", routedToAcademy: academy._id };
    if (req.query.status) query.status = req.query.status;

    const reports = await Report.find(query)
      .populate("reportedBy", "email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const reportsWithTargets = await Promise.all(
      reports.map(async (report) => {
        const obj = report.toObject();
        if (report.targetType === "video") {
          obj.targetData = await Video.findById(report.targetId)
            .populate("player", "fullName profileImageUrl")
            .select("_id title videoUrl thumbnailUrl duration player status");
        }
        return obj;
      }),
    );

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reportsWithTargets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: reportsWithTargets,
    });
  } catch (error) {
    console.error("Get academy moderation inbox error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Academy takes moderation action on a reported video (delete or archive)
 * @route PUT /api/academy/moderation/:id
 * @access Private (academy)
 */
const moderateVideoReport = async (req, res) => {
  try {
    const { action, resolution } = req.body;

    if (!action || !["deleted", "archived"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'deleted' or 'archived'",
      });
    }

    const academy = await Academy.findOne({ user: req.user._id });
    if (!academy) {
      return res
        .status(404)
        .json({ success: false, message: "Academy not found" });
    }

    const report = await Report.findOne({
      _id: req.params.id,
      routedTo: "academy",
      routedToAcademy: academy._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found in your moderation inbox",
      });
    }

    if (report.targetType === "video") {
      const video = await Video.findById(report.targetId);
      if (video) {
        if (action === "deleted") {
          video.status = "rejected";
          video.privacy = "private";
          video.moderationNote =
            resolution || "Removed by academy after community guideline report";
        } else if (action === "archived") {
          video.privacy = "private";
          video.moderationNote =
            resolution ||
            "Archived by academy after community guideline report";
        }
        await video.save();

        // Notify the video uploader
        try {
          await Notification.create({
            userId: video.uploadedBy,
            type: "video_takedown_warning",
            message: `Your video "${video.title}" has been ${action} by your academy following a community guideline report.`,
            metadata: { videoId: video._id, action },
          });
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    }

    report.status = "resolved";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.resolution = resolution || action;
    report.academyActionTaken = action;
    report.academyReviewedAt = new Date();
    await report.save();

    res.status(200).json({
      success: true,
      message: `Video ${action} successfully`,
      data: report,
    });
  } catch (error) {
    console.error("Academy moderation action error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createReport,
  getReports,
  reviewReport,
  getAcademyModerationInbox,
  moderateVideoReport,
};
