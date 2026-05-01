const mongoose = require('mongoose');
const { PLAYER_POSITION_VALUES, AVAILABILITY_STATUSES } = require('../utils/profile.constants');

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
      enum: PLAYER_POSITION_VALUES,
    },
    primaryPosition: {
      type: String,
      enum: PLAYER_POSITION_VALUES,
    },
    secondaryPosition: {
      type: String,
      enum: [...PLAYER_POSITION_VALUES, ''],
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
    clubHistory: [
      {
        clubName: {
          type: String,
          trim: true,
        },
        startDate: {
          type: Date,
        },
        endDate: {
          type: Date,
        },
      },
    ],
    playingStyleTags: [
      {
        type: String,
        trim: true,
      },
    ],
    technicalStrengths: {
      type: String,
      maxlength: [4000, 'Technical strengths cannot exceed 4000 characters'],
    },
    technicalWeaknesses: {
      type: String,
      maxlength: [4000, 'Technical weaknesses cannot exceed 4000 characters'],
    },
    availabilityStatus: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'Available',
    },
    birthCertificateUrl: {
      type: String,
    },
    passportUrl: {
      type: String,
    },
    isAgeVerified: {
      type: Boolean,
      default: false,
    },
    disciplinaryRecord: {
      yellowCards: {
        type: Number,
        default: 0,
        min: 0,
      },
      redCards: {
        type: Number,
        default: 0,
        min: 0,
      },
      notes: {
        type: String,
        maxlength: [1000, 'Disciplinary notes cannot exceed 1000 characters'],
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      updatedAt: {
        type: Date,
      },
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

playerSchema.pre('validate', function (next) {
  if (!this.primaryPosition && this.position) {
    this.primaryPosition = this.position;
  }

  if (!this.position && this.primaryPosition) {
    this.position = this.primaryPosition;
  }

  next();
});

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

