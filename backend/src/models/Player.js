const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    academy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Academy',
      required: [true, 'Academy is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    position: {
      type: String,
      enum: ['goalkeeper', 'defender', 'midfielder', 'forward'],
      required: [true, 'Position is required'],
    },
    secondaryPosition: {
      type: String,
      enum: ['goalkeeper', 'defender', 'midfielder', 'forward', ''],
    },
    strongFoot: {
      type: String,
      enum: ['left', 'right', 'both'],
      default: 'right',
    },
    height: {
      type: Number, // in centimeters
      min: [100, 'Height must be at least 100cm'],
      max: [250, 'Height cannot exceed 250cm'],
    },
    weight: {
      type: Number, // in kilograms
      min: [30, 'Weight must be at least 30kg'],
      max: [150, 'Weight cannot exceed 150kg'],
    },
    jerseyNumber: {
      type: Number,
      min: [1, 'Jersey number must be at least 1'],
      max: [99, 'Jersey number cannot exceed 99'],
    },
    profileImageUrl: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    nationality: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Aggregated stats from matches
    totalGoals: {
      type: Number,
      default: 0,
    },
    totalAssists: {
      type: Number,
      default: 0,
    },
    totalMatches: {
      type: Number,
      default: 0,
    },
    totalMinutesPlayed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for calculating age
playerSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for videos
playerSchema.virtual('videos', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'player',
});

// Index for efficient searching
playerSchema.index({ fullName: 'text' });
playerSchema.index({ position: 1, status: 1 });
playerSchema.index({ academy: 1 });

module.exports = mongoose.model('Player', playerSchema);

