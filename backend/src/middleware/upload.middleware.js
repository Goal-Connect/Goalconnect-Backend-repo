const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary once credentials are provided via .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary Storage for Videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'goalconnect_videos',
    resource_type: 'video', // Must specify video to process correctly
    allowed_formats: ['mp4', 'mkv', 'mov', 'avi'],
    // e.g. limit size or format further if needed
  },
});

// Configure Multer
const uploadVideoMw = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Optional: Limit to 100 MB per video for now
  },
});

module.exports = {
  cloudinary,
  uploadVideoMw,
};
