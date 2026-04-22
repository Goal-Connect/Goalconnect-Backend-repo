const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getAcademies,
  getAcademy,
  getMyAcademy,
  updateMyAcademy,
  getMyPlayers,
  uploadLicense,
} = require('../controllers/academy.controller');

const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { authorize, requireApproved } = require('../middleware/role.middleware');

// Validation rules
const updateAcademyValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('contactPhone')
    .optional()
    .matches(/^[+]?[\d\s-]+$/)
    .withMessage('Please provide a valid phone number'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
];

/**
 * @swagger
 * tags:
 *   name: Academies
 *   description: Academy discovery and academy-owned resources
 */

/**
 * @swagger
 * /academies:
 *   get:
 *     summary: List approved academies
 *     tags: [Academies]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of academies
 */
// Public routes
router.get('/', getAcademies);

/**
 * @swagger
 * /academies/me:
 *   get:
 *     summary: Get current academy profile
 *     tags: [Academies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academy profile
 *       401:
 *         description: Unauthorized
 */
// Protected routes (Academy only) - MUST come before /:id to avoid matching "me" as an ID
router.get('/me', protect, authorize('academy'), getMyAcademy);

/**
 * @swagger
 * /academies/me:
 *   put:
 *     summary: Update current academy profile
 *     tags: [Academies]
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
 *         description: Academy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/me', protect, authorize('academy'), updateAcademyValidation, updateMyAcademy);

/**
 * @swagger
 * /academies/me/players:
 *   get:
 *     summary: Get players belonging to current academy
 *     tags: [Academies]
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of players
 *       401:
 *         description: Unauthorized
 */
router.get('/me/players', protect, authorize('academy'), getMyPlayers);

/**
 * @swagger
 * /academies/me/license:
 *   post:
 *     summary: Upload academy license document
 *     tags: [Academies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: License uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/me/license', protect, authorize('academy'), uploadLicense);

/**
 * @swagger
 * /academies/{id}:
 *   get:
 *     summary: Get academy by ID
 *     tags: [Academies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Academy ID
 *     responses:
 *       200:
 *         description: Academy details
 *       404:
 *         description: Academy not found
 */
// Dynamic ID route - MUST come after /me routes
router.get('/:id', optionalAuth, getAcademy);

module.exports = router;

