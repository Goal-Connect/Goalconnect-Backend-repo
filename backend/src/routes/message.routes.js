const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const { sendMessage, getConversation } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireApproved } = require('../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Direct messaging between users
 */

// All message routes require authentication
router.use(protect);

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message to another user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /messages/{userId}:
 *   get:
 *     summary: Get conversation with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation messages
 *       401:
 *         description: Unauthorized
 */
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
