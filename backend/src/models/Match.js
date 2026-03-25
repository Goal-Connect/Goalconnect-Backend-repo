const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    academy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Academy',
      required: [true, 'Academy is required'],
    },
    opponent: {
      type: String,
      required: [true, 'Opponent name is required'],
      trim: true,
    },
    opponentAcademy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Academy',
    },
    matchDate: {
      type: Date,
      required: [true, 'Match date is required'],
    },
    location: {
      type: String,
      trim: true,
    },
    matchType: {
      type: String,
      enum: ['friendly', 'league', 'tournament', 'training'],
      default: 'friendly',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Score
    homeScore: {
      type: Number,
      min: 0,
    },
    awayScore: {
      type: Number,
      min: 0,
    },
    isHome: {
      type: Boolean,
      default: true,
    },
    // Result verification
    resultStatus: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'disputed'],
      default: 'pending',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    disputeReason: {
      type: String,
    },
    // Participating players
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    }],
    // Match notes
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for match stats
matchSchema.virtual('stats', {
  ref: 'MatchStats',
  localField: '_id',
  foreignField: 'match',
});

// Virtual for match videos
matchSchema.virtual('videos', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'match',
});

// Virtual for result string
matchSchema.virtual('result').get(function () {
  if (this.homeScore === undefined || this.awayScore === undefined) return null;
  const score = this.isHome
    ? `${this.homeScore} - ${this.awayScore}`
    : `${this.awayScore} - ${this.homeScore}`;
  return score;
});

// Index for efficient queries
matchSchema.index({ academy: 1, matchDate: -1 });
matchSchema.index({ matchDate: -1 });

module.exports = mongoose.model('Match', matchSchema);

