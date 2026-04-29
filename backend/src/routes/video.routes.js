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
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
} = require('../controllers/video.controller');

const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');
const { uploadVideoMw } = require('../middleware/upload.middleware');

// Validation rules
const uploadVideoValidation = [
  body('playerId')
    .optional()
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
  // videoUrl comes from Cloudinary via multer, so we remove the requirement here.
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
// Public/Smart routes
router.get('/feed', optionalAuth, getVideoFeed);

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
 *     summary: Upload a video (academy or player)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Video uploaded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires approved account)
 */
// Protected routes (Academy and Player)
router.post(
  '/', 
  protect, 
  authorize('academy', 'player'), 
  requireApproved, 
  uploadVideoMw.single('video'),
  uploadVideoValidation, 
  uploadVideo 
);

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
router.put('/:id', protect, authorize('academy', 'player', 'admin'), updateVideoValidation, updateVideo);

/**
 * @swagger
 * /videos/{id}:
 *   delete:
 *     summary: Delete video (owner only)
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
router.delete('/:id', protect, authorize('academy', 'player', 'admin'), deleteVideo);

/**
 * @swagger
 * /videos/{id}/like:
 *   post:
 *     summary: Toggle like on a video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/like', protect, toggleLike);

/**
 * @swagger
 * /videos/{id}/comments:
 *   get:
 *     summary: Get comments for a video
 *     tags: [Videos]
 */
router.get('/:id/comments', optionalAuth, getComments);

/**
 * @swagger
 * /videos/{id}/comments:
 *   post:
 *     summary: Add a comment to a video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/comments', protect, addComment);

/**
 * @swagger
 * /videos/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/comments/:commentId', protect, deleteComment);

/**
 * @swagger
 * /videos/{id}/comments/{commentId}/like:
 *   post:
 *     summary: Toggle like on a comment
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/comments/:commentId/like', protect, toggleCommentLike);

module.exports = router;

