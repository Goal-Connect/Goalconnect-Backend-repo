const mongoose = require("mongoose");

const REPORT_TARGET_MODEL_BY_TYPE = {
  user: "User",
  academy: "Academy",
  player: "Player",
  video: "Video",
  match: "Match",
  message: "Message",
};

const REPORT_TARGET_TYPE_BY_MODEL = Object.fromEntries(
  Object.entries(REPORT_TARGET_MODEL_BY_TYPE).map(([type, model]) => [
    model,
    type,
  ])
);

const REPORT_TARGET_TYPES = Object.keys(REPORT_TARGET_MODEL_BY_TYPE);
const REPORT_TARGET_MODELS = Object.values(REPORT_TARGET_MODEL_BY_TYPE);

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter reference is required"],
    },
    targetType: {
      type: String,
      enum: {
        values: REPORT_TARGET_TYPES,
        message: `Target type must be one of: ${REPORT_TARGET_TYPES.join(", ")}`,
      },
      required: [true, "Target type is required"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Target ID is required"],
      refPath: "targetModel",
    },
    targetModel: {
      type: String,
      enum: {
        values: REPORT_TARGET_MODELS,
        message: `targetModel must be one of: ${REPORT_TARGET_MODELS.join(", ")}`,
      },
      required: [true, "Target model is required"],
    },
    reason: {
      type: String,
      enum: {
        values: [
          "inappropriate_content",
          "spam",
          "harassment",
          "fake_information",
          "copyright_violation",
          "match_manipulation",
          "other",
        ],
        message: "Invalid report reason",
      },
      required: [true, "Report reason is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "reviewed", "resolved", "dismissed"],
        message:
          "Status must be pending, reviewed, resolved, or dismissed",
      },
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: [1000, "Resolution cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reportSchema.pre("validate", function (next) {
  const type = this.targetType;
  const model = this.targetModel;

  if (type && !model) {
    this.targetModel = REPORT_TARGET_MODEL_BY_TYPE[type];
  } else if (model && !type) {
    this.targetType = REPORT_TARGET_TYPE_BY_MODEL[model];
  } else if (type && model) {
    const expected = REPORT_TARGET_MODEL_BY_TYPE[type];
    if (expected && expected !== model) {
      this.invalidate(
        "targetModel",
        `targetModel must be "${expected}" for targetType "${type}"`
      );
    }
  }

  next();
});

reportSchema.index({ reportedBy: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

Report.REPORT_TARGET_MODEL_BY_TYPE = REPORT_TARGET_MODEL_BY_TYPE;
Report.REPORT_TARGET_TYPE_BY_MODEL = REPORT_TARGET_TYPE_BY_MODEL;

module.exports = Report;
