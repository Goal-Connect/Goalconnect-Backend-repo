const mongoose = require("mongoose");

const VALID_STATUS_TRANSITIONS = {
  pending: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

const academyPlayerRequestSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: [true, "Player reference is required"],
    },
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: [true, "Academy reference is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected", "withdrawn"],
        message: "Status must be pending, accepted, rejected, or withdrawn",
      },
      default: "pending",
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: [500, "Review note cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

academyPlayerRequestSchema.pre("validate", function (next) {
  if (!this.isModified("status") || this.isNew) return next();

  const prev = this._original?.status;
  if (!prev) return next();

  const allowed = VALID_STATUS_TRANSITIONS[prev] || [];
  if (!allowed.includes(this.status)) {
    this.invalidate(
      "status",
      `Cannot transition from "${prev}" to "${this.status}"`
    );
  }

  if (["accepted", "rejected"].includes(this.status)) {
    if (!this.reviewedBy) {
      this.invalidate("reviewedBy", "reviewedBy is required when accepting or rejecting");
    }
    if (!this.reviewedAt) {
      this.reviewedAt = new Date();
    }
  }

  next();
});

academyPlayerRequestSchema.post("init", function () {
  this._original = { status: this.status };
});

academyPlayerRequestSchema.post("save", async function (doc) {
  if (doc.status !== "accepted") return;

  const Player = mongoose.model("Player");
  await Player.findByIdAndUpdate(doc.playerId, {
    academyId: doc.academyId,
  });

  await mongoose.model("AcademyPlayerRequest").updateMany(
    {
      playerId: doc.playerId,
      _id: { $ne: doc._id },
      status: "pending",
    },
    {
      status: "withdrawn",
      reviewNote: "Auto-withdrawn: player accepted another academy",
    }
  );
});

academyPlayerRequestSchema.index({ playerId: 1, academyId: 1, status: 1 });
academyPlayerRequestSchema.index({ academyId: 1, status: 1, createdAt: -1 });
academyPlayerRequestSchema.index(
  { playerId: 1, academyId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

const AcademyPlayerRequest = mongoose.model(
  "AcademyPlayerRequest",
  academyPlayerRequestSchema
);

AcademyPlayerRequest.VALID_STATUS_TRANSITIONS = VALID_STATUS_TRANSITIONS;

module.exports = AcademyPlayerRequest;
