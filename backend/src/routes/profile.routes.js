const express = require("express");
const { 
  uploadProfileImage, 
  uploadImageOnly, 
  uploadDocumentOnly, 
  getMe,
  updateProfile
} = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadImageMw, uploadDocMw } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.put("/:id", updateProfile);
router.post("/upload-image", uploadImageMw.single("image"), uploadProfileImage);
router.post("/upload", uploadImageMw.single("image"), uploadImageOnly);
router.post("/upload-document", uploadDocMw.single("document"), uploadDocumentOnly);

module.exports = router;
