const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerVideos,
  savePlayer,
  unsavePlayer,
  getSavedPlayers,
} = require('../controllers/player.controller');

const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');

// Validation rules
const createPlayerValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['goalkeeper', 'defender', 'midfielder', 'forward'])
    .withMessage('Invalid position'),
  body('strongFoot')
    .optional()
    .isIn(['left', 'right', 'both'])
    .withMessage('Strong foot must be left, right, or both'),
  body('height')
    .optional()
    .isInt({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),
  body('weight')
    .optional()
    .isInt({ min: 30, max: 150 })
    .withMessage('Weight must be between 30 and 150 kg'),
  body('jerseyNumber')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
];

const updatePlayerValidation = [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('position')
    .optional()
    .isIn(['goalkeeper', 'defender', 'midfielder', 'forward'])
    .withMessage('Invalid position'),
  body('strongFoot')
    .optional()
    .isIn(['left', 'right', 'both'])
    .withMessage('Strong foot must be left, right, or both'),
  body('height')
    .optional()
    .isInt({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),
  body('weight')
    .optional()
    .isInt({ min: 30, max: 150 })
    .withMessage('Weight must be between 30 and 150 kg'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
];

// Public routes
router.get('/saved', protect, authorize('scout'), getSavedPlayers);
router.get('/', optionalAuth, getPlayers);
router.get('/:id', optionalAuth, getPlayer);
router.get('/:id/videos', optionalAuth, getPlayerVideos);

// Scout save/unsave routes
router.post('/:id/save', protect, authorize('scout'), savePlayer);
router.delete('/:id/save', protect, authorize('scout'), unsavePlayer);

// Protected routes (Academy only)
router.post('/', protect, authorize('academy'), requireApproved, createPlayerValidation, createPlayer);
router.put('/:id', protect, authorize('academy'), updatePlayerValidation, updatePlayer);
router.delete('/:id', protect, authorize('academy'), deletePlayer);

module.exports = router;

