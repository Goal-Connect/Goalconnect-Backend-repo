const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player is required'],
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    thumbnailUrl: {
      type: String,
    },
    videoType: {
      type: String,
      enum: ['highlight', 'drill', 'match'],
      required: [true, 'Video type is required'],
    },
    drillType: {
      type: String,
      enum: ['dribbling', 'shooting', 'passing', 'speed', 'agility', 'other'],
    },
    duration: {
      type: Number, // in seconds
    },
    fileSize: {
      type: Number, // in bytes
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    processingStatus: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    processingError: {
      type: String,
    },
    privacy: {
      type: String,
      enum: ['public', 'scout_only', 'private'],
      default: 'public',
    },
    views: {
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

// Virtual for drill analysis
videoSchema.virtual('analysis', {
  ref: 'DrillAnalysis',
  localField: '_id',
  foreignField: 'video',
  justOne: true,
});

// Increment view count
videoSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Index for efficient queries
videoSchema.index({ player: 1, createdAt: -1 });
videoSchema.index({ videoType: 1 });
videoSchema.index({ processingStatus: 1 });
videoSchema.index({ status: 1 });

module.exports = mongoose.model('Video', videoSchema);

