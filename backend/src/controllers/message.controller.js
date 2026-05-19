const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Send a message (HTTP)
 * @route   POST /api/messages
 * @access  Private (authenticated users can start and reply)
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

    // No role restriction for starting conversations — allow any authenticated user
    // to initiate a conversation (existing conversations remain unaffected).

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

/**
 * @desc    Get list of conversation partners (summary)
 * @route   GET /api/messages
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const me = req.user._id.toString();

    // Fetch recent messages involving the user, newest first
    const messages = await Message.find({
      $or: [
        { senderId: me },
        { receiverId: me },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Reduce to a map of otherUserId -> { lastMessage, unreadCount }
    const convoMap = new Map();

    for (const m of messages) {
      const other = m.senderId.toString() === me ? m.receiverId.toString() : m.senderId.toString();
      const existing = convoMap.get(other);

      if (!existing) {
        convoMap.set(other, {
          lastMessage: m,
          unreadCount: m.receiverId.toString() === me && !m.isRead ? 1 : 0,
        });
      } else {
        // messages are sorted desc, so only increment unreadCount for additional unread messages
        if (m.receiverId.toString() === me && !m.isRead) {
          existing.unreadCount += 1;
        }
      }
    }

    const userIds = Array.from(convoMap.keys());

    // Populate user details for the conversation partners
    const users = await User.find({ _id: { $in: userIds } }).select('-password').lean();
    const usersById = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const data = userIds.map((id) => {
      const entry = convoMap.get(id);
      const lm = entry.lastMessage;
      return {
        user: usersById[id] || { _id: id },
        lastMessage: {
          _id: lm._id.toString(),
          senderId: lm.senderId.toString(),
          receiverId: lm.receiverId.toString(),
          content: lm.content,
          sharedVideo: lm.sharedVideo,
          isRead: lm.isRead,
          createdAt: lm.createdAt,
        },
        unreadCount: entry.unreadCount,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching conversations' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getConversations,
};
