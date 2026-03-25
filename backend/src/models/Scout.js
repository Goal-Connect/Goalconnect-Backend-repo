const mongoose = require('mongoose');

const scoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'Ethiopia',
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImageUrl: {
      type: String,
    },
    documents: [
      {
        docType: {
          type: String,
          enum: ['national_id', 'license', 'other'],
        },
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
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    interestedPositions: [{
      type: String,
      enum: ['goalkeeper', 'defender', 'midfielder', 'forward'],
    }],
    preferredAgeRange: {
      min: {
        type: Number,
        default: 14,
      },
      max: {
        type: Number,
        default: 25,
      },
    },
    preferredRegions: [{
      type: String,
    }],
    // Saved/Favorited players
    savedPlayers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    }],
    // Recently viewed players
    recentlyViewed: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Method to add player to saved list
scoutSchema.methods.savePlayer = function (playerId) {
  if (!this.savedPlayers.includes(playerId)) {
    this.savedPlayers.push(playerId);
  }
  return this.save();
};

// Method to remove player from saved list
scoutSchema.methods.unsavePlayer = function (playerId) {
  this.savedPlayers = this.savedPlayers.filter(
    (id) => id.toString() !== playerId.toString()
  );
  return this.save();
};

// Method to add to recently viewed
scoutSchema.methods.addToRecentlyViewed = function (playerId) {
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(
    (item) => item.player.toString() !== playerId.toString()
  );
  // Add to beginning
  this.recentlyViewed.unshift({ player: playerId, viewedAt: new Date() });
  // Keep only last 20
  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }
  return this.save();
};

module.exports = mongoose.model('Scout', scoutSchema);

