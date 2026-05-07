const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getAllAcademies,
  approveAcademy,
  rejectAcademy,
  suspendAcademy,
  getAllScouts,
  approveScout,
  suspendScout,
  getAllUsers,
  getAllVideos,
  updateVideoStatus,
  takedownVideo,
} = require('../controllers/admin.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard and moderation
 */

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 */
// Dashboard
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get list of users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */
// User management
router.get('/users', getAllUsers);

/**
 * @swagger
 * /admin/academies:
 *   get:
 *     summary: Get academies (all statuses)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of academies
 *       401:
 *         description: Unauthorized
 */
// Academy management
router.get('/academies', getAllAcademies);

/**
 * @swagger
 * /admin/academies/{id}/approve:
 *   put:
 *     summary: Approve an academy
 *     tags: [Admin]
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
 *         description: Academy approved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Academy not found
 */
router.put('/academies/:id/approve', approveAcademy);

/**
 * @swagger
 * /admin/academies/{id}/reject:
 *   put:
 *     summary: Reject an academy
 *     tags: [Admin]
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
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Academy rejected
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Academy not found
 */
router.put('/academies/:id/reject', rejectAcademy);

/**
 * @swagger
 * /admin/academies/{id}/suspend:
 *   put:
 *     summary: Suspend an academy
 *     tags: [Admin]
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
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Academy suspended
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Academy not found
 */
router.put('/academies/:id/suspend', suspendAcademy);

/**
 * @swagger
 * /admin/scouts:
 *   get:
 *     summary: Get scouts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scouts
 *       401:
 *         description: Unauthorized
 */
// Scout management
router.get('/scouts', getAllScouts);

/**
 * @swagger
 * /admin/scouts/{id}/approve:
 *   put:
 *     summary: Approve a scout
 *     tags: [Admin]
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
 *         description: Scout approved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Scout not found
 */
router.put('/scouts/:id/approve', approveScout);

/**
 * @swagger
 * /admin/scouts/{id}/suspend:
 *   put:
 *     summary: Suspend a scout
 *     tags: [Admin]
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
 *         description: Scout suspended
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Scout not found
 */
router.put('/scouts/:id/suspend', suspendScout);

/**
 * @swagger
 * /admin/videos:
 *   get:
 *     summary: Get all videos for moderation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of videos
 *       401:
 *         description: Unauthorized
 */
router.get('/videos', getAllVideos);

/**
 * @swagger
 * /admin/videos/{id}/status:
 *   put:
 *     summary: Update video moderation status
 *     tags: [Admin]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               moderationNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 */
router.put('/videos/:id/status', updateVideoStatus);

/**
 * @swagger
 * /admin/videos/{id}/takedown:
 *   put:
 *     summary: Take down an inappropriate video and warn the uploader
 *     tags: [Admin]
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for taking the video down (sent to uploader)
 *     responses:
 *       200:
 *         description: Video taken down and warning sent
 *       400:
 *         description: Reason is required
 *       404:
 *         description: Video not found
 */
router.put('/videos/:id/takedown', takedownVideo);

module.exports = router;

