const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  addMatchStats,
  getMatchStats,
} = require('../controllers/match.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');

// Validation rules
const createMatchValidation = [
  body('opponent')
    .notEmpty()
    .withMessage('Opponent name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Opponent name must be between 2 and 100 characters'),
  body('matchDate')
    .notEmpty()
    .withMessage('Match date is required')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('matchType')
    .optional()
    .isIn(['friendly', 'league', 'tournament', 'training'])
    .withMessage('Invalid match type'),
  body('isHome')
    .optional()
    .isBoolean()
    .withMessage('isHome must be a boolean'),
];

const updateMatchValidation = [
  body('opponent')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Opponent name must be between 2 and 100 characters'),
  body('matchDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('homeScore')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Score must be between 0 and 50'),
  body('awayScore')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Score must be between 0 and 50'),
  body('resultStatus')
    .optional()
    .isIn(['pending', 'submitted', 'verified', 'disputed'])
    .withMessage('Invalid result status'),
];

const matchStatsValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('Player ID is required')
    .isMongoId()
    .withMessage('Invalid player ID'),
  body('goals')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Goals must be between 0 and 20'),
  body('assists')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Assists must be between 0 and 20'),
  body('minutesPlayed')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Minutes played must be between 0 and 120'),
  body('yellowCards')
    .optional()
    .isInt({ min: 0, max: 2 })
    .withMessage('Yellow cards must be between 0 and 2'),
  body('redCard')
    .optional()
    .isBoolean()
    .withMessage('Red card must be a boolean'),
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10'),
];

// All routes require authentication and academy role
router.use(protect);
router.use(authorize('academy'));

// Match CRUD routes
router.get('/', getMatches);
router.post('/', requireApproved, createMatchValidation, createMatch);
router.get('/:id', getMatch);
router.put('/:id', requireApproved, updateMatchValidation, updateMatch);
router.delete('/:id', requireApproved, deleteMatch);

// Match stats routes
router.get('/:id/stats', getMatchStats);
router.post('/:id/stats', requireApproved, matchStatsValidation, addMatchStats);

module.exports = router;



