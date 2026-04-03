const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const { sendMessage, getConversation } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireApproved } = require('../middleware/role.middleware');

// All message routes require authentication
router.use(protect);

// POST /api/messages - send message
router.post(
  '/',
  requireApproved,
  [
    body('receiverId')
      .notEmpty()
      .withMessage('receiverId is required')
      .isMongoId()
      .withMessage('receiverId must be a valid Mongo ID'),
    body('content')
      .notEmpty()
      .withMessage('content is required')
      .isLength({ max: 2000 })
      .withMessage('content cannot exceed 2000 characters'),
  ],
  sendMessage
);

// GET /api/messages/:userId - get conversation with a specific user
router.get(
  '/:userId',
  [
    param('userId')
      .isMongoId()
      .withMessage('userId must be a valid Mongo ID'),
  ],
  getConversation
);

module.exports = router;
