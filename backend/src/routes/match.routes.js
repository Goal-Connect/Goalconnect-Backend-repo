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

/**
 * @swagger
 * tags:
 *   name: Matches
 *   description: Academy matches and player statistics
 */

// All routes require authentication and academy role
router.use(protect);
router.use(authorize('academy'));

/**
 * @swagger
 * /matches:
 *   get:
 *     summary: List matches for current academy
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
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
 *         name: matchType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matches
 *       401:
 *         description: Unauthorized
 */
// Match CRUD routes
router.get('/', getMatches);

/**
 * @swagger
 * /matches:
 *   post:
 *     summary: Create match
 *     tags: [Matches]
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
 *         description: Match created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireApproved, createMatchValidation, createMatch);

/**
 * @swagger
 * /matches/{id}:
 *   get:
 *     summary: Get match details (with stats)
 *     tags: [Matches]
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
 *         description: Match details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.get('/:id', getMatch);

/**
 * @swagger
 * /matches/{id}:
 *   put:
 *     summary: Update match (including scores)
 *     tags: [Matches]
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
 *         description: Match updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.put('/:id', requireApproved, updateMatchValidation, updateMatch);

/**
 * @swagger
 * /matches/{id}:
 *   delete:
 *     summary: Delete match
 *     tags: [Matches]
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
 *         description: Match deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.delete('/:id', requireApproved, deleteMatch);

/**
 * @swagger
 * /matches/{id}/stats:
 *   get:
 *     summary: Get stats for a match
 *     tags: [Matches]
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
 *         description: Match stats
 *       401:
 *         description: Unauthorized
 */
// Match stats routes
router.get('/:id/stats', getMatchStats);

/**
 * @swagger
 * /matches/{id}/stats:
 *   post:
 *     summary: Add stats for a match
 *     tags: [Matches]
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
 *       201:
 *         description: Match stats added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/stats', requireApproved, matchStatsValidation, addMatchStats);

module.exports = router;



