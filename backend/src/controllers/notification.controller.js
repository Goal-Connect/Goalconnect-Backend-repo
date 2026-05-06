const Notification = require("../models/Notification");
const { ErrorResponse } = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// @desc    Get all notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: count,
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }

  // Make sure notification belongs to user
  if (notification.userId.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to access this notification`, 401));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/mark-all-read
// @access  Private
exports.markAllRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }

  // Make sure notification belongs to user
  if (notification.userId.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to access this notification`, 401));
  }

  await notification.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Helper function to create notification (internal use)
exports.createNotification = async ({ userId, type, message, metadata }) => {
  try {
    await Notification.create({
      userId,
      type,
      message,
      metadata,
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
};
