const mongoose = require('mongoose');

const academySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Academy name is required'],
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    woreda: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    foundingDate: {
      type: Date,
    },
    licenseDocumentUrl: {
      type: String,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    documents: [
      {
        fileName: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logoUrl: {
      type: String,
    },
    registrationStatus: {
      type: String,
      enum: ['awaiting_approval', 'approved', 'rejected', 'suspended'],
      default: 'awaiting_approval',
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
    },
    suspensionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting player count
academySchema.virtual('playerCount', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'academy',
  count: true,
});

// Virtual for getting players
academySchema.virtual('players', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'academy',
});

module.exports = mongoose.model('Academy', academySchema);

