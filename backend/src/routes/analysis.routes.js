const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const { authorize, requireApproved } = require("../middleware/role.middleware");
const {
  getTrackerAnalyticsReview,
  verifyTrackerAnalyticsBatch,
  convertAnnotatedVideo,
} = require("../controllers/video.controller");

router.get(
  "/review/:id",
  protect,
  authorize("academy", "admin"),
  requireApproved,
  getTrackerAnalyticsReview,
);

router.post(
  "/verify-batch",
  protect,
  authorize("academy", "admin"),
  requireApproved,
  verifyTrackerAnalyticsBatch,
);

router.post(
  "/convert-video/:id",
  protect,
  authorize("academy", "admin"),
  requireApproved,
  convertAnnotatedVideo,
);

module.exports = router;
