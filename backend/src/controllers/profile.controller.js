const asyncHandler = require("../middleware/async");
const { ErrorResponse } = require("../utils/errorResponse");
const User = require("../models/User");
const Player = require("../models/Player");
const Scout = require("../models/Scout");
const Academy = require("../models/Academy");

/**
 * @desc    Upload profile picture / logo
 * @route   POST /api/profile/upload-image
 * @access  Private
 */
exports.uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  const imageUrl = req.file.path;
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Update URL in appropriate model based on role
  if (user.role === "player") {
    await Player.findOneAndUpdate({ user: user._id }, { profileImageUrl: imageUrl });
  } else if (user.role === "scout") {
    await Scout.findOneAndUpdate({ user: user._id }, { profileImageUrl: imageUrl });
  } else if (user.role === "academy") {
    await Academy.findOneAndUpdate({ user: user._id }, { logoUrl: imageUrl });
  } else if (user.role === "admin") {
    user.profileImageUrl = imageUrl;
    await user.save();
  }

  res.status(200).json({
    success: true,
    data: imageUrl,
  });
});

/**
 * @desc    Generic image upload (returns URL only)
 * @route   POST /api/profiles/upload
 * @access  Private
 */
exports.uploadImageOnly = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  res.status(200).json({
    success: true,
    data: req.file.path,
  });
});

/**
 * @desc    Generic document upload (returns URL only)
 * @route   POST /api/profiles/upload-document
 * @access  Private
 */
exports.uploadDocumentOnly = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  res.status(200).json({
    success: true,
    data: req.file.path,
  });
});

/**
 * @desc    Get current user profile (with joined data)
 * @route   GET /api/profile/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  let profile = null;

  if (req.user.role === "player") {
    profile = await Player.findOne({ user: req.user._id }).populate("academy", "name logoUrl");
  } else if (req.user.role === "scout") {
    profile = await Scout.findOne({ user: req.user._id });
  } else if (req.user.role === "academy") {
    profile = await Academy.findOne({ user: req.user._id });
  } else {
    profile = await User.findById(req.user._id);
  }

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      profile: profile,
    },
  });
});
/**
 * @desc    Update profile (by ID)
 * @route   PUT /api/profiles/:id
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const profileId = req.params.id;
  let profile = null;
  let role = "";

  // Find profile and determine role
  const player = await Player.findById(profileId);
  if (player) {
    profile = player;
    role = "player";
  } else {
    const scout = await Scout.findById(profileId);
    if (scout) {
      profile = scout;
      role = "scout";
    } else {
      const academy = await Academy.findById(profileId);
      if (academy) {
        profile = academy;
        role = "academy";
      }
    }
  }

  if (!profile) {
    return next(new ErrorResponse("Profile not found", 404));
  }

  // Authorization check (simplified for now: owners, academies for their players, or admins)
  // TODO: Add stricter authorization logic

  // Update fields
  const updateData = req.body;
  
  // Special handling for nested fields if necessary
  if (updateData.disciplinaryRecord && role === "player") {
    updateData.disciplinaryRecord.updatedBy = req.user._id;
    updateData.disciplinaryRecord.updatedAt = new Date();
  }

  const updatedProfile = await profile.constructor.findByIdAndUpdate(
    profileId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // Auto-verify age if document URLs are present (duplicated logic from player controller for safety)
  if (role === "player" && (updatedProfile.birthCertificateUrl || updatedProfile.passportUrl)) {
    updatedProfile.isAgeVerified = true;
    await updatedProfile.save();
  }

  res.status(200).json({
    success: true,
    data: updatedProfile,
  });
});
