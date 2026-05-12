const express = require("express");
const {
  uploadProfileImage,
  uploadImageOnly,
  uploadDocumentOnly,
  getMe,
  updateProfile,
  downloadDocument,
} = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  uploadImageMw,
  uploadDocMw,
  withUploadErrorHandling,
} = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.put("/:id", updateProfile);
router.post(
  "/upload-image",
  withUploadErrorHandling(uploadImageMw.single("image")),
  uploadProfileImage,
);
router.post(
  "/upload",
  withUploadErrorHandling(uploadImageMw.single("image")),
  uploadImageOnly,
);
router.post(
  "/upload-document",
  withUploadErrorHandling(uploadDocMw.single("document")),
  uploadDocumentOnly,
);
router.post("/download-document", downloadDocument);

module.exports = router;
