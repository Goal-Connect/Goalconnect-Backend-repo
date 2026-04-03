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

// Public routes
router.get('/feed', getVideoFeed);
router.get('/', getVideos);
router.get('/:id', optionalAuth, getVideo);
router.get('/:id/analysis', optionalAuth, getVideoAnalysis);
router.post('/:id/view', incrementVideoView);

// Protected routes (Academy only)
router.post('/', protect, authorize('academy'), requireApproved, uploadVideoValidation, uploadVideo);
router.put('/:id', protect, authorize('academy'), updateVideoValidation, updateVideo);
router.delete('/:id', protect, authorize('academy'), deleteVideo);

module.exports = router;

