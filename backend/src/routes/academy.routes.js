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

// Public routes
router.get('/', getAcademies);

// Protected routes (Academy only) - MUST come before /:id to avoid matching "me" as an ID
router.get('/me', protect, authorize('academy'), getMyAcademy);
router.put('/me', protect, authorize('academy'), updateAcademyValidation, updateMyAcademy);
router.get('/me/players', protect, authorize('academy'), getMyPlayers);
router.post('/me/license', protect, authorize('academy'), uploadLicense);

// Dynamic ID route - MUST come after /me routes
router.get('/:id', optionalAuth, getAcademy);

module.exports = router;

