const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  savePlayer,
  unsavePlayer,
  getSavedPlayers,
  getRecentlyViewed,
} = require('../controllers/scout.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');

// Validation rules
const updateProfileValidation = [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s-]+$/)
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('interestedPositions')
    .optional()
    .isArray()
    .withMessage('Interested positions must be an array'),
  body('interestedPositions.*')
    .optional()
    .isIn(['goalkeeper', 'defender', 'midfielder', 'forward'])
    .withMessage('Invalid position'),
  body('preferredAgeRange.min')
    .optional()
    .isInt({ min: 10, max: 40 })
    .withMessage('Minimum age must be between 10 and 40'),
  body('preferredAgeRange.max')
    .optional()
    .isInt({ min: 10, max: 40 })
    .withMessage('Maximum age must be between 10 and 40'),
];

// All routes require authentication and scout role
router.use(protect);
router.use(authorize('scout'));

// Profile routes
router.get('/me', getMyProfile);
router.put('/me', updateProfileValidation, updateMyProfile);

// Saved players routes
router.get('/saved-players', getSavedPlayers);
router.post('/saved-players/:playerId', requireApproved, savePlayer);
router.delete('/saved-players/:playerId', unsavePlayer);

// Recently viewed
router.get('/recently-viewed', getRecentlyViewed);

module.exports = router;

