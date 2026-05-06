const express = require("express");
const { uploadProfileImage, uploadImageOnly, getMe } = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadImageMw } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.post("/upload-image", uploadImageMw.single("image"), uploadProfileImage);
router.post("/upload", uploadImageMw.single("image"), uploadImageOnly);

module.exports = router;
