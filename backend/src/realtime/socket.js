const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// userId(string) -> Set<socketId>
const onlineUsers = new Map();

let ioInstance;

const addSocketForUser = (userId, socketId) => {
  const key = userId.toString();
  let set = onlineUsers.get(key);
  if (!set) {
    set = new Set();
    onlineUsers.set(key, set);
  }
  set.add(socketId);
};

const removeSocketForUser = (userId, socketId) => {
  const key = userId.toString();
  const set = onlineUsers.get(key);
  if (!set) return;
  set.delete(socketId);
  if (!set.size) {
    onlineUsers.delete(key);
  }
};

const emitToUser = (userId, event, payload) => {
  const set = onlineUsers.get(userId.toString());
  if (!set || !ioInstance) return;
  set.forEach((sid) => {
    ioInstance.to(sid).emit(event, payload); 
  });
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL
          : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Auth middleware: expects JWT token in handshake auth or query
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || user.status === 'suspended') {
        return next(new Error('Not authorized'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    addSocketForUser(userId, socket.id);

    // Send a simple connected event
    socket.emit('connection:success', {
      userId,
      role: user.role,
    });

    // Send or start conversation
    socket.on('message:send', async (payload, callback) => {
      try {
        const { toUserId, content, sharedVideo } = payload || {};

        if (!toUserId || (!content?.trim() && !sharedVideo)) {
          const error = 'toUserId and either content or a sharedVideo is required';
          if (callback) return callback({ success: false, error });
          return;
        }

        const senderId = user._id.toString();
        const receiverId = toUserId.toString();

        if (senderId === receiverId) {
          const error = 'You cannot send a message to yourself';
          if (callback) return callback({ success: false, error });
          return;
        }

        // Check if a conversation already exists between these two users
        const existing = await Message.findOne({
          $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        }).lean();

        // Enforce rule: only a scout can send the very first message
        if (!existing && user.role !== 'scout') {
          const error = 'Only scouts can start a new conversation';
          if (callback) return callback({ success: false, error });
          return;
        }

        let message = await Message.create({
          senderId,
          receiverId,
          content: content ? content.trim() : '',
          sharedVideo: sharedVideo || undefined,
        });

        // If a video was shared, populate it immediately so the frontend has rich embed data
        if (message.sharedVideo) {
          await message.populate('sharedVideo');
        }

        // ── Critical: serialize all ObjectIds to plain strings before emitting ──
        // Mongoose ObjectId objects do NOT reliably equal plain strings with ===
        // on the client, even if their string value is the same.
        const safeMessage = {
          _id:        message._id.toString(),
          senderId:   message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          content:    message.content,
          sharedVideo: message.sharedVideo,

          isRead:     message.isRead,
          createdAt:  message.createdAt,
          updatedAt:  message.updatedAt,
        };

        // Acknowledge to sender
        if (callback) {
          callback({ success: true, data: safeMessage });
        } else {
          socket.emit('message:sent', safeMessage);
        }

        // Deliver to receiver if online
        emitToUser(receiverId, 'message:received', safeMessage);
      } catch (err) {
        console.error('message:send error:', err);
        if (callback) {
          callback({ success: false, error: 'Server error sending message' });
        }
      }
    });


    // Fetch conversation history between current user and another user
    socket.on('conversation:history', async (payload, callback) => {
      try {
        const { withUserId, limit = 50 } = payload || {};
        if (!withUserId) {
          return callback?.({ success: false, error: 'withUserId is required' });
        }

        const me = user._id.toString();
        const other = withUserId.toString();

        const messages = await Message.find({
          $or: [
            { senderId: me, receiverId: other },
            { senderId: other, receiverId: me },
          ],
        })
          .populate('sharedVideo')
          .sort({ createdAt: 1 })
          .limit(Number(limit) || 50)
          .lean();

        // Serialize ObjectIds to plain strings so client === comparisons work
        const safeMessages = messages.map((m) => ({
          _id:        m._id.toString(),
          senderId:   m.senderId.toString(),
          receiverId: m.receiverId.toString(),
          content:    m.content,
          sharedVideo: m.sharedVideo,
          isRead:     m.isRead,
          createdAt:  m.createdAt,
          updatedAt:  m.updatedAt,
        }));

        callback?.({ success: true, data: safeMessages });
      } catch (err) {
        console.error('conversation:history error:', err);
        callback?.({ success: false, error: 'Server error fetching history' });
      }
    });


    // ── Edit a message ──────────────────────────────────────────────────────
    // payload: { messageId, newContent }
    socket.on('message:edit', async (payload, callback) => {
      try {
        const { messageId, newContent } = payload || {};

        if (!messageId || !newContent?.trim()) {
          return callback?.({ success: false, error: 'messageId and newContent are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
          return callback?.({ success: false, error: 'Message not found' });
        }

        // Only the original sender can edit
        if (message.senderId.toString() !== userId) {
          return callback?.({ success: false, error: 'You can only edit your own messages' });
        }

        message.content = newContent.trim();
        await message.save();

        const safeMessage = {
          _id:        message._id.toString(),
          senderId:   message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          content:    message.content,
          isRead:     message.isRead,
          edited:     true,
          createdAt:  message.createdAt,
          updatedAt:  message.updatedAt,
        };

        // Acknowledge sender
        callback?.({ success: true, data: safeMessage });

        // Real-time update to the other participant
        const otherId = message.receiverId.toString() === userId
          ? message.senderId.toString()
          : message.receiverId.toString();
        emitToUser(otherId, 'message:edited', safeMessage);

      } catch (err) {
        console.error('message:edit error:', err);
        callback?.({ success: false, error: 'Server error editing message' });
      }
    });

    // ── Delete a message ────────────────────────────────────────────────────
    // payload: { messageId }
    socket.on('message:delete', async (payload, callback) => {
      try {
        const { messageId } = payload || {};

        if (!messageId) {
          return callback?.({ success: false, error: 'messageId is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
          return callback?.({ success: false, error: 'Message not found' });
        }

        // Only the original sender can delete
        if (message.senderId.toString() !== userId) {
          return callback?.({ success: false, error: 'You can only delete your own messages' });
        }

        const otherId = message.receiverId.toString() === userId
          ? message.senderId.toString()
          : message.receiverId.toString();

        await Message.findByIdAndDelete(messageId);

        // Acknowledge sender
        callback?.({ success: true, data: { _id: messageId } });

        // Real-time removal on the other participant's screen
        emitToUser(otherId, 'message:deleted', { _id: messageId });

      } catch (err) {
        console.error('message:delete error:', err);
        callback?.({ success: false, error: 'Server error deleting message' });
      }
    });

    socket.on('disconnect', () => {
      removeSocketForUser(userId, socket.id);
    });
  });
};

module.exports = { initSocket };
