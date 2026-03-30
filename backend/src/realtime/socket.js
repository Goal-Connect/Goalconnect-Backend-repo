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
        const { toUserId, content } = payload || {};

        if (!toUserId || !content || !content.trim()) {
          const error = 'toUserId and non-empty content are required';
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

        const message = await Message.create({
          senderId,
          receiverId,
          content: content.trim(),
        });

        const safeMessage = message.toObject();

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
          .sort({ createdAt: 1 })
          .limit(Number(limit) || 50)
          .lean();

        callback?.({ success: true, data: messages });
      } catch (err) {
        console.error('conversation:history error:', err);
        callback?.({ success: false, error: 'Server error fetching history' });
      }
    });

    socket.on('disconnect', () => {
      removeSocketForUser(userId, socket.id);
    });
  });
};

module.exports = { initSocket };
