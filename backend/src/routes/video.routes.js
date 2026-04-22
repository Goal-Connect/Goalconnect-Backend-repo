const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getVideos,
  getVideo,
  uploadVideo,
  updateVideo,
  deleteVideo,
  getVideoAnalysis,
  getVideoFeed,
  incrementVideoView,
} = require('../controllers/video.controller');

const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');

// Validation rules
const uploadVideoValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('Player ID is required')
    .isMongoId()
    .withMessage('Invalid player ID'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('videoUrl')
    .notEmpty()
    .withMessage('Video URL is required')
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('videoType')
    .notEmpty()
    .withMessage('Video type is required')
    .isIn(['highlight', 'drill', 'match'])
    .withMessage('Video type must be highlight, drill, or match'),
  body('drillType')
    .optional()
    .isIn(['dribbling', 'shooting', 'passing', 'speed', 'agility', 'other'])
    .withMessage('Invalid drill type'),
  body('privacy')
    .optional()
    .isIn(['public', 'scout_only', 'private'])
    .withMessage('Privacy must be public, scout_only, or private'),
];

const updateVideoValidation = [
  body('title')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('privacy')
    .optional()
    .isIn(['public', 'scout_only', 'private'])
    .withMessage('Privacy must be public, scout_only, or private'),
];

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Player videos and analysis
 */

/**
 * @swagger
 * /videos/feed:
 *   get:
 *     summary: Get personalized video feed
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: Video feed
 */
// Public routes
router.get('/feed', getVideoFeed);

/**
 * @swagger
 * /videos:
 *   get:
 *     summary: List public analyzed videos
 *     tags: [Videos]
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
 *         name: videoType
 *         schema:
 *           type: string
 *       - in: query
 *         name: playerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of videos
 */
router.get('/', getVideos);

/**
 * @swagger
 * /videos/{id}:
 *   get:
 *     summary: Get video by ID (with privacy checks)
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video details
 *       403:
 *         description: Forbidden due to privacy
 *       404:
 *         description: Video not found
 */
router.get('/:id', optionalAuth, getVideo);

/**
 * @swagger
 * /videos/{id}/analysis:
 *   get:
 *     summary: Get analysis data for a video
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video analysis
 *       404:
 *         description: Video or analysis not found
 */
router.get('/:id/analysis', optionalAuth, getVideoAnalysis);

/**
 * @swagger
 * /videos/{id}/view:
 *   post:
 *     summary: Increment video view count
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View count incremented
 *       404:
 *         description: Video not found
 */
router.post('/:id/view', incrementVideoView);

/**
 * @swagger
 * /videos:
 *   post:
 *     summary: Upload a video (academy only)
 *     tags: [Videos]
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
 *         description: Video uploaded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
// Protected routes (Academy only)
router.post('/', protect, authorize('academy'), requireApproved, uploadVideoValidation, uploadVideo);

/**
 * @swagger
 * /videos/{id}:
 *   put:
 *     summary: Update video metadata (academy only)
 *     tags: [Videos]
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
 *         description: Video updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.put('/:id', protect, authorize('academy'), updateVideoValidation, updateVideo);

/**
 * @swagger
 * /videos/{id}:
 *   delete:
 *     summary: Delete video (academy only)
 *     tags: [Videos]
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
 *         description: Video deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.delete('/:id', protect, authorize('academy'), deleteVideo);

module.exports = router;

