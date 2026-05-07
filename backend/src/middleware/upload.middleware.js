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
    resource_type: 'video',
    allowed_formats: ['mp4', 'mkv', 'mov', 'avi'],
  },
});

// Create Cloudinary Storage for Images (Profile Pictures, Logos)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'goalconnect_images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }], // Limit size for profile pics
  },
});

// Create Cloudinary Storage for Documents (Birth certificates, Passports)
const docStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'goalconnect_documents',
    resource_type: 'auto', // 'auto' allows for PDF, docx, etc. besides images
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
  },
});

// Configure Multer
const uploadVideoMw = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB for videos
  },
});

const uploadImageMw = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for images
  },
});

const uploadDocMw = multer({
  storage: docStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB for documents
  },
});

module.exports = {
  cloudinary,
  uploadVideoMw,
  uploadImageMw,
  uploadDocMw,
};
