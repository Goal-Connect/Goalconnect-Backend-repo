const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { authorize, requireApproved } = require("../middleware/role.middleware");
const {
  getAcademyModerationInbox,
  moderateVideoReport,
} = require("../controllers/report.controller");

// Academy moderation inbox
router.get("/", protect, authorize("academy"), requireApproved, getAcademyModerationInbox);

// Take action on a reported video (delete or archive)
router.put("/:id", protect, authorize("academy"), requireApproved, moderateVideoReport);

module.exports = router;
