const mongoose = require("mongoose");

const AUDIT_TARGET_TYPES = [
  "User",
  "Academy",
  "Player",
  "Video",
  "Match",
  "MatchStats",
  "Message",
  "Report",
  "Notification",
  "AcademyPlayerRequest",
  "DrillAnalysis",
  "Favorite",
  "Scout",
];

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    action: {
      type: String,
      enum: {
        values: [
          "user_registered",
          "user_login",
          "user_logout",
          "password_changed",
          "password_reset",
          "user_status_updated",
          "user_deleted",
          "academy_approved",
          "academy_rejected",
          "video_approved",
          "video_rejected",
          "match_resolved",
          "academy_created",
          "academy_updated",
          "academy_deleted",
          "documents_uploaded",
          "player_added",
          "player_updated",
          "player_deleted",
          "player_join_requested",
          "player_join_accepted",
          "player_join_rejected",
          "player_join_withdrawn",
          "match_created",
          "match_updated",
          "match_score_submitted",
          "match_verified",
          "match_disputed",
          "match_deleted",
          "match_stats_created",
          "match_stats_updated",
          "match_stats_deleted",
          "video_uploaded",
          "video_updated",
          "video_deleted",
          "message_sent",
          "message_deleted",
          "report_created",
          "report_reviewed",
          "drill_analysis_created",
          "drill_analysis_updated",
          "drill_analysis_deleted",
          "favorite_added",
          "favorite_removed",
          "scout_profile_created",
          "scout_profile_updated",
          "notification_sent",
        ],
        message: "Invalid action type",
      },
      required: [true, "Action is required"],
    },
    targetType: {
      type: String,
      enum: AUDIT_TARGET_TYPES,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

AuditLog.AUDIT_TARGET_TYPES = AUDIT_TARGET_TYPES;

module.exports = AuditLog;
