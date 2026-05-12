const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { createReport } = require("../controllers/report.controller");

// Scouts create reports
router.post("/", protect, authorize("scout"), createReport);

module.exports = router;
