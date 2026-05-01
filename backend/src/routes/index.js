const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const academyRoutes = require('./academy.routes');
const playerRoutes = require('./player.routes');
const scoutRoutes = require('./scout.routes');
const videoRoutes = require('./video.routes');
const matchRoutes = require('./match.routes');
const adminRoutes = require('./admin.routes');
const messageRoutes = require('./message.routes');
const profileRoutes = require('./profile.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/academies', academyRoutes);
router.use('/players', playerRoutes);
router.use('/scouts', scoutRoutes);
router.use('/videos', videoRoutes);
router.use('/matches', matchRoutes);
router.use('/admin', adminRoutes);
router.use('/messages', messageRoutes);
router.use('/profiles', profileRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check for the API
 *     tags: [Misc]
 *     responses:
 *       200:
 *         description: API is running
 */
// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GoalConnect API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

