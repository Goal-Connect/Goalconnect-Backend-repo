const { validationResult } = require('express-validator');
const Match = require('../models/Match');
const MatchStats = require('../models/MatchStats');
const Academy = require('../models/Academy');
const Player = require('../models/Player');
const Scout = require('../models/Scout');
const Notification = require('../models/Notification');
const { ErrorResponse } = require('../utils/errorResponse');

/**
 * @desc    Get academy's matches
 * @route   GET /api/matches
 * @access  Private (Academy)
 */
const getMatches = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { academy: academy._id },
        { opponentAcademy: academy._id }
      ]
    };

    // Filter by match type
    if (req.query.matchType) {
      query.matchType = req.query.matchType;
    }

    const matches = await Match.find(query)
      .populate('academy', 'name logoUrl')
      .populate('opponentAcademy', 'name logoUrl')
      .populate('rsvps.scout', 'fullName profileImageUrl organization')
      .skip(skip)
      .limit(limit)
      .sort({ matchDate: -1 });

    const total = await Match.countDocuments(query);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: matches,
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single match
 * @route   GET /api/matches/:id
 * @access  Private (Academy)
 */
const getMatch = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const match = await Match.findOne({
      _id: req.params.id,
      $or: [
        { academy: academy._id },
        { opponentAcademy: academy._id }
      ]
    })
    .populate('academy', 'name logoUrl')
    .populate('opponentAcademy', 'name logoUrl')
    .populate('players', 'fullName position jerseyNumber');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Get match stats
    const stats = await MatchStats.find({ match: match._id })
      .populate('player', 'fullName position jerseyNumber');

    // Populate RSVPs with scout info if not already populated
    await match.populate('rsvps.scout', 'fullName profileImageUrl organization');

    res.status(200).json({
      success: true,
      data: {
        ...match.toObject(),
        stats,
      },
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Create match
 * @route   POST /api/matches
 * @access  Private (Academy)
 */
const createMatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const { 
      opponent, 
      opponentAcademy, 
      matchDate, 
      location, 
      matchType, 
      isHome, 
      notes, 
      isPublic, 
      eventType,
      startTime,
      endTime,
      venue,
      description,
      contactPerson,
      contactPhone
    } = req.body;

    const match = await Match.create({
      academy: academy._id,
      opponent,
      opponentAcademy: opponentAcademy || undefined,
      matchDate,
      location,
      matchType: matchType || 'friendly',
      isHome: isHome !== undefined ? isHome : true,
      isPublic: isPublic !== undefined ? isPublic : false,
      eventType: eventType || 'match',
      notes,
      startTime,
      endTime,
      venue,
      description,
      contactPerson,
      contactPhone,
      resultStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match,
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update match (including scores)
 * @route   PUT /api/matches/:id
 * @access  Private (Academy)
 */
const updateMatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const allowedFields = [
      'opponent',
      'opponentAcademy',
      'matchDate',
      'location',
      'matchType',
      'isPublic',
      'eventType',
      'homeScore',
      'awayScore',
      'isHome',
      'notes',
      'resultStatus',
      'startTime',
      'endTime',
      'venue',
      'description',
      'contactPerson',
      'contactPhone'
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const match = await Match.findOneAndUpdate(
      { _id: req.params.id, academy: academy._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: match,
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Delete match
 * @route   DELETE /api/matches/:id
 * @access  Private (Academy)
 */
const deleteMatch = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const match = await Match.findOneAndDelete({
      _id: req.params.id,
      academy: academy._id,
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Also delete related stats
    await MatchStats.deleteMany({ match: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully',
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Add player stats to match
 * @route   POST /api/matches/:id/stats
 * @access  Private (Academy)
 */
const addMatchStats = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const match = await Match.findOne({
      _id: req.params.id,
      academy: academy._id,
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    const { playerId, goals, assists, minutesPlayed, yellowCards, redCard, rating, notes } = req.body;

    // Verify player belongs to academy
    const player = await Player.findOne({
      _id: playerId,
      academy: academy._id,
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found in your academy',
      });
    }

    // Check if stats already exist for this player in this match
    let stats = await MatchStats.findOne({
      match: match._id,
      player: playerId,
    });

    if (stats) {
      // Update existing stats
      stats.goals = goals || 0;
      stats.assists = assists || 0;
      stats.minutesPlayed = minutesPlayed || 0;
      stats.yellowCards = yellowCards || 0;
      stats.redCard = redCard || false;
      stats.rating = rating;
      stats.notes = notes;
      await stats.save();
    } else {
      // Create new stats
      stats = await MatchStats.create({
        match: match._id,
        player: playerId,
        goals: goals || 0,
        assists: assists || 0,
        minutesPlayed: minutesPlayed || 0,
        yellowCards: yellowCards || 0,
        redCard: redCard || false,
        rating,
        notes,
        approvalStatus: 'pending',
      });

      // Add player to match if not already
      if (!match.players.includes(playerId)) {
        match.players.push(playerId);
        await match.save();
      }
    }

    // Update player totals
    await updatePlayerTotals(playerId);

    res.status(201).json({
      success: true,
      message: 'Match stats added successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Add match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get match stats
 * @route   GET /api/matches/:id/stats
 * @access  Private (Academy)
 */
const getMatchStats = async (req, res) => {
  try {
    const academy = await Academy.findOne({ user: req.user._id });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy profile not found',
      });
    }

    const match = await Match.findOne({
      _id: req.params.id,
      academy: academy._id,
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    const stats = await MatchStats.find({ match: match._id })
      .populate('player', 'fullName position jerseyNumber profileImageUrl');

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Helper function to update player totals
const updatePlayerTotals = async (playerId) => {
  const stats = await MatchStats.find({ player: playerId });
  
  const totals = stats.reduce(
    (acc, stat) => ({
      goals: acc.goals + (stat.goals || 0),
      assists: acc.assists + (stat.assists || 0),
      matches: acc.matches + 1,
      minutes: acc.minutes + (stat.minutesPlayed || 0),
    }),
    { goals: 0, assists: 0, matches: 0, minutes: 0 }
  );

  await Player.findByIdAndUpdate(playerId, {
    totalGoals: totals.goals,
    totalAssists: totals.assists,
    totalMatches: totals.matches,
    totalMinutesPlayed: totals.minutes,
  });
};

/**
 * @desc    Get public matches (Match Center)
 * @route   GET /api/matches/public
 * @access  Public
 */
const getPublicMatches = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { 
      isPublic: true,
      matchDate: { $gte: new Date() } // Only upcoming matches
    };

    if (req.query.eventType) {
      query.eventType = req.query.eventType;
    }

    if (req.query.region) {
      // Need to lookup academy region, requiring a join or populated match
      // For simplicity, let's fetch all and filter or add region to Match
      // We will populate academy to allow filtering on frontend if not doing complex aggregation here
    }

    const matches = await Match.find(query)
      .populate('academy', 'name region logoUrl')
      .populate('opponentAcademy', 'name logoUrl')
      .populate('rsvps.scout', 'fullName profileImageUrl organization')
      .skip(skip)
      .limit(limit)
      .sort({ matchDate: 1 }); // Sort by soonest

    const total = await Match.countDocuments(query);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: matches,
    });
  } catch (error) {
    console.error('Get public matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    RSVP for a public match/trial
 * @route   POST /api/matches/:id/rsvp
 * @access  Private (Scout)
 */
const rsvpMatch = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({ success: false, message: 'Scout profile not found' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.isPublic) {
      return res.status(400).json({ success: false, message: 'Can only RSVP to public events' });
    }

    // Check if already RSVPed
    const alreadyRsvped = match.rsvps.some(rsvp => rsvp.scout.toString() === scout._id.toString());
    if (alreadyRsvped) {
      return res.status(400).json({ success: false, message: 'Already RSVPed to this event' });
    }

    match.rsvps.push({ scout: scout._id });
    await match.save();
    await match.populate('rsvps.scout', 'fullName profileImageUrl organization');

    // Trigger notification to academy
    const academy = await Academy.findById(match.academy);
    if (academy) {
      await Notification.create({
        userId: academy.user,
        type: 'scout_rsvp',
        message: `${scout.fullName} RSVPed to your event against ${match.opponent}`,
        metadata: {
          matchId: match._id,
          senderId: req.user._id,
          academyId: academy._id
        }
      });
    }

    res.status(200).json({ success: true, message: 'Successfully RSVPed', data: match });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Cancel RSVP for a match
 * @route   DELETE /api/matches/:id/rsvp
 * @access  Private (Scout)
 */
const cancelRsvpMatch = async (req, res) => {
  try {
    const scout = await Scout.findOne({ user: req.user._id });
    if (!scout) {
      return res.status(404).json({ success: false, message: 'Scout profile not found' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.rsvps = match.rsvps.filter(rsvp => rsvp.scout.toString() !== scout._id.toString());
    await match.save();
    await match.populate('rsvps.scout', 'fullName profileImageUrl organization');

    // Trigger notification to academy
    const academy = await Academy.findById(match.academy);
    if (academy) {
      await Notification.create({
        userId: academy.user,
        type: 'scout_rsvp_cancel',
        message: `${scout.fullName} cancelled their RSVP for the event against ${match.opponent}`,
        metadata: {
          matchId: match._id,
          senderId: req.user._id,
          academyId: academy._id
        }
      });
    }

    res.status(200).json({ success: true, message: 'RSVP cancelled', data: match });
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  addMatchStats,
  getMatchStats,
  getPublicMatches,
  rsvpMatch,
  cancelRsvpMatch,
};



