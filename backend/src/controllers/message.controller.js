const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Send a message (HTTP)
 * @route   POST /api/messages
 * @access  Private (scout starts, then scout/player can reply)
 */
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const sender = req.user;
    const { receiverId, content } = req.body;

    if (sender._id.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a message to yourself',
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver user not found',
      });
    }

    const senderId = sender._id.toString();
    const otherId = receiver._id.toString();

    // Check if a conversation already exists between these two users
    const existing = await Message.findOne({
      $or: [
        { senderId, receiverId: otherId },
        { senderId: otherId, receiverId: senderId },
      ],
    }).lean();

    // Enforce rule: only a scout can start a new conversation, and only with a player
    if (!existing) {
      if (sender.role !== 'scout' || receiver.role !== 'player') {
        return res.status(403).json({
          success: false,
          message: 'Only scouts can start a new conversation with players',
        });
      }
    }

    const message = await Message.create({
      senderId,
      receiverId: otherId,
      content: content.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message',
    });
  }
};

/**
 * @desc    Get conversation history with another user
 * @route   GET /api/messages/:userId
 * @access  Private
 */
const getConversation = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversation',
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
};
