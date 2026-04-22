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

/**
 * @swagger
 * tags:
 *   name: Players
 *   description: Player discovery and academy-managed players
 */

/**
 * @swagger
 * /players:
 *   get:
 *     summary: List players with filters
 *     tags: [Players]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *       - in: query
 *         name: strongFoot
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of players
 */
// Public routes
router.get('/saved', protect, authorize('scout'), getSavedPlayers);
router.get('/', optionalAuth, getPlayers);

/**
 * @swagger
 * /players/{id}:
 *   get:
 *     summary: Get player by ID
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player details
 *       404:
 *         description: Player not found
 */
router.get('/:id', optionalAuth, getPlayer);

/**
 * @swagger
 * /players/{id}/videos:
 *   get:
 *     summary: Get videos for a player
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: List of player videos
 */
router.get('/:id/videos', optionalAuth, getPlayerVideos);

/**
 * @swagger
 * /players/{id}/save:
 *   post:
 *     summary: Save player to scout favorites
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player saved
 *       401:
 *         description: Unauthorized
 */
// Scout save/unsave routes
router.post('/:id/save', protect, authorize('scout'), savePlayer);

/**
 * @swagger
 * /players/{id}/save:
 *   delete:
 *     summary: Remove player from scout favorites
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player unsaved
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/save', protect, authorize('scout'), unsavePlayer);

/**
 * @swagger
 * /players/saved:
 *   get:
 *     summary: Get players saved by current scout
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved players
 *       401:
 *         description: Unauthorized
 */
router.get('/saved', protect, authorize('scout'), getSavedPlayers);

/**
 * @swagger
 * /players:
 *   post:
 *     summary: Create new player (academy only)
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Player created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
// Protected routes (Academy only)
router.post('/', protect, authorize('academy'), requireApproved, createPlayerValidation, createPlayer);

/**
 * @swagger
 * /players/{id}:
 *   put:
 *     summary: Update player (academy only)
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Player updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Player not found
 */
router.put('/:id', protect, authorize('academy'), updatePlayerValidation, updatePlayer);

/**
 * @swagger
 * /players/{id}:
 *   delete:
 *     summary: Delete player (academy only)
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Player not found
 */
router.delete('/:id', protect, authorize('academy'), deletePlayer);

module.exports = router;

