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

/**
 * @swagger
 * tags:
 *   name: Scouts
 *   description: Scout profile and saved players
 */

// All routes require authentication and scout role
router.use(protect);
router.use(authorize('scout'));

/**
 * @swagger
 * /scouts/me:
 *   get:
 *     summary: Get current scout profile
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scout profile
 *       401:
 *         description: Unauthorized
 */
// Profile routes
router.get('/me', getMyProfile);

/**
 * @swagger
 * /scouts/me:
 *   put:
 *     summary: Update scout profile
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/me', updateProfileValidation, updateMyProfile);

/**
 * @swagger
 * /scouts/saved-players:
 *   get:
 *     summary: Get players saved by current scout
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved players
 *       401:
 *         description: Unauthorized
 */
// Saved players routes
router.get('/saved-players', getSavedPlayers);

/**
 * @swagger
 * /scouts/saved-players/{playerId}:
 *   post:
 *     summary: Save a player
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player saved
 *       401:
 *         description: Unauthorized
 */
router.post('/saved-players/:playerId', requireApproved, savePlayer);

/**
 * @swagger
 * /scouts/saved-players/{playerId}:
 *   delete:
 *     summary: Remove a player from saved list
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player removed from saved list
 *       401:
 *         description: Unauthorized
 */
router.delete('/saved-players/:playerId', unsavePlayer);

/**
 * @swagger
 * /scouts/recently-viewed:
 *   get:
 *     summary: Get recently viewed players
 *     tags: [Scouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recently viewed players
 *       401:
 *         description: Unauthorized
 */
// Recently viewed
router.get('/recently-viewed', getRecentlyViewed);

module.exports = router;

