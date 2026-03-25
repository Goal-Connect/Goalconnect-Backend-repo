const mongoose = require('mongoose');

const drillAnalysisSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      unique: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    metrics: {
      // Speed metrics (m/s)
      sprintSpeed: {
        type: Number,
        min: 0,
      },
      topSpeed: {
        type: Number,
        min: 0,
      },
      averageSpeed: {
        type: Number,
        min: 0,
      },
      // Distance metrics (meters)
      distanceCovered: {
        type: Number,
        min: 0,
      },
      // Movement metrics
      accelerations: {
        type: Number,
        min: 0,
      },
      decelerations: {
        type: Number,
        min: 0,
      },
      sprintCount: {
        type: Number,
        min: 0,
      },
      // Performance scores (0-100)
      agilityScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      staminaScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      technicalScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    // Movement heatmap data (for visualization)
    heatmapData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Tracking data (frame-by-frame positions)
    trackingData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Analysis metadata
    analysisVersion: {
      type: String,
      default: '1.0',
    },
    processingTime: {
      type: Number, // in milliseconds
    },
    confidence: {
      type: Number, // 0-1, how confident the CV model is
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate overall score based on individual metrics
drillAnalysisSchema.pre('save', function (next) {
  const metrics = this.metrics;
  if (metrics.agilityScore && metrics.staminaScore && metrics.technicalScore) {
    metrics.overallScore = Math.round(
      (metrics.agilityScore + metrics.staminaScore + metrics.technicalScore) / 3
    );
  }
  next();
});

// Index for efficient queries
drillAnalysisSchema.index({ player: 1, createdAt: -1 });

module.exports = mongoose.model('DrillAnalysis', drillAnalysisSchema);

