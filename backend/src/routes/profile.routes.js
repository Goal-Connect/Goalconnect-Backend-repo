const express = require("express");
const router = express.Router();

const { updateProfile } = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: Player profile updates and verification
 */

/**
 * @swagger
 * /profiles/{id}:
 *   put:
 *     summary: Update a player profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put("/:id", protect, updateProfile);

module.exports = router;
