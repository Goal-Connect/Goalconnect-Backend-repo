const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    type: {
      type: String,
      enum: {
        values: [
          "academy_approved",
          "academy_rejected",
          "new_message",
          "match_created",
          "match_score_submitted",
          "match_verified",
          "match_disputed",
          "video_approved",
          "video_rejected",
          "player_added",
          "player_join_request",
          "player_join_accepted",
          "player_join_rejected",
          "account_suspended",
          "general",
        ],
        message: "Invalid notification type",
      },
      required: [true, "Notification type is required"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy" },
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
      videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      academyPlayerRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademyPlayerRequest",
      },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
