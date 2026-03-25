const mongoose = require('mongoose');

const matchStatsSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'Match is required'],
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player is required'],
    },
    // Performance stats
    goals: {
      type: Number,
      default: 0,
      min: 0,
    },
    assists: {
      type: Number,
      default: 0,
      min: 0,
    },
    minutesPlayed: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },
    // Cards
    yellowCards: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    redCard: {
      type: Boolean,
      default: false,
    },
    // Additional stats
    shots: {
      type: Number,
      default: 0,
      min: 0,
    },
    shotsOnTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
    passes: {
      type: Number,
      default: 0,
      min: 0,
    },
    passAccuracy: {
      type: Number, // percentage
      min: 0,
      max: 100,
    },
    tackles: {
      type: Number,
      default: 0,
      min: 0,
    },
    interceptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Goalkeeper specific
    saves: {
      type: Number,
      default: 0,
      min: 0,
    },
    cleanSheet: {
      type: Boolean,
    },
    // Submission and verification
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // Rating (optional, can be set by coach/scout)
    rating: {
      type: Number,
      min: 1,
      max: 10,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique player per match
matchStatsSchema.index({ match: 1, player: 1 }, { unique: true });

// Post save hook to update player aggregated stats
matchStatsSchema.post('save', async function () {
  const Player = mongoose.model('Player');
  const MatchStats = mongoose.model('MatchStats');

  // Aggregate all stats for this player
  const stats = await MatchStats.aggregate([
    { $match: { player: this.player, approvalStatus: 'approved' } },
    {
      $group: {
        _id: '$player',
        totalGoals: { $sum: '$goals' },
        totalAssists: { $sum: '$assists' },
        totalMatches: { $sum: 1 },
        totalMinutesPlayed: { $sum: '$minutesPlayed' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Player.findByIdAndUpdate(this.player, {
      totalGoals: stats[0].totalGoals,
      totalAssists: stats[0].totalAssists,
      totalMatches: stats[0].totalMatches,
      totalMinutesPlayed: stats[0].totalMinutesPlayed,
    });
  }
});

module.exports = mongoose.model('MatchStats', matchStatsSchema);

