const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const { sendMessage, getConversation, getConversations } = require('../controllers/message.controller');
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

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Get conversation partners list (recent conversations)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of conversations to return (optional)
 *     responses:
 *       200:
 *         description: List of conversation partners with last message and unread counts
 *       401:
 *         description: Unauthorized
 */
// GET /api/messages - list conversation partners
router.get('/', getConversations);

module.exports = router;
