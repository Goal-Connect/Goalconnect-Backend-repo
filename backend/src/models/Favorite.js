const mongoose = require("mongoose");

const FAVORITE_TARGET_MODEL_BY_TYPE = {
  player: "Player",
  academy: "Academy",
  video: "Video",
};

const FAVORITE_TARGET_TYPE_BY_MODEL = Object.fromEntries(
  Object.entries(FAVORITE_TARGET_MODEL_BY_TYPE).map(([type, model]) => [
    model,
    type,
  ])
);

const FAVORITE_TARGET_TYPES = Object.keys(FAVORITE_TARGET_MODEL_BY_TYPE);
const FAVORITE_TARGET_MODELS = Object.values(FAVORITE_TARGET_MODEL_BY_TYPE);

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    targetType: {
      type: String,
      enum: {
        values: FAVORITE_TARGET_TYPES,
        message: `Target type must be one of: ${FAVORITE_TARGET_TYPES.join(", ")}`,
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
        values: FAVORITE_TARGET_MODELS,
        message: `targetModel must be one of: ${FAVORITE_TARGET_MODELS.join(", ")}`,
      },
      required: [true, "Target model is required"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

favoriteSchema.pre("validate", function (next) {
  const type = this.targetType;
  const model = this.targetModel;

  if (type && !model) {
    this.targetModel = FAVORITE_TARGET_MODEL_BY_TYPE[type];
  } else if (model && !type) {
    this.targetType = FAVORITE_TARGET_TYPE_BY_MODEL[model];
  } else if (type && model) {
    const expected = FAVORITE_TARGET_MODEL_BY_TYPE[type];
    if (expected && expected !== model) {
      this.invalidate(
        "targetModel",
        `targetModel must be "${expected}" for targetType "${type}"`
      );
    }
  }

  next();
});

favoriteSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true }
);
favoriteSchema.index({ userId: 1, targetType: 1, createdAt: -1 });

const Favorite = mongoose.model("Favorite", favoriteSchema);

Favorite.FAVORITE_TARGET_MODEL_BY_TYPE = FAVORITE_TARGET_MODEL_BY_TYPE;
Favorite.FAVORITE_TARGET_TYPE_BY_MODEL = FAVORITE_TARGET_TYPE_BY_MODEL;

module.exports = Favorite;
