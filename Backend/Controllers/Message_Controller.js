const { Conversation, Message } = require("../Models/Message");

// ─────────────────────────────────────────────────────────────────────────────
// GET OR CREATE CONVERSATION
// POST /message/conversation
// Body: { senderId, receiverId }
// ─────────────────────────────────────────────────────────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ success: false, message: "senderId and receiverId are required." });
    }

    // Look for existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("participants", "name profileImage role");

    // Create one if it doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCount:  { [senderId]: 0, [receiverId]: 0 },
      });
      await conversation.populate("participants", "name profileImage role");
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CONVERSATIONS FOR A USER (Inbox)
// GET /message/conversations/:userId
// ─────────────────────────────────────────────────────────────────────────────
const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name profileImage role")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count:   conversations.length,
      data:    conversations,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MESSAGES IN A CONVERSATION (Paginated)
// GET /message/:conversationId?page=1&limit=30
// ─────────────────────────────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip  = (page - 1) * limit;

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })   // newest first
      .skip(skip)
      .limit(limit)
      .populate("sender", "name profileImage");

    // Reverse so the UI gets them oldest → newest for rendering
    return res.status(200).json({
      success: true,
      page,
      count:   messages.length,
      data:    messages.reverse(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND A MESSAGE
// POST /message/send
// Body: { conversationId, senderId, content }
// ─────────────────────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;

    if (!conversationId || !senderId || !content?.trim()) {
      return res.status(400).json({ success: false, message: "conversationId, senderId, and content are required." });
    }

    // Verify conversation exists and sender is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }
    const isParticipant = conversation.participants.some(p => String(p) === String(senderId));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "You are not part of this conversation." });
    }

    // Create the message
    const message = await Message.create({
      conversation: conversationId,
      sender:       senderId,
      content:      content.trim(),
    });
    await message.populate("sender", "name profileImage");

    // Update conversation's lastMessage + increment unread for the other participant
    const otherParticipant = conversation.participants.find(p => String(p) !== String(senderId));
    const unreadKey        = `unreadCount.${otherParticipant}`;

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content:   message.content,
        sender:    senderId,
        createdAt: message.createdAt,
      },
      $inc: { [unreadKey]: 1 },
    });

    return res.status(201).json({ success: true, data: message });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK MESSAGES AS READ
// PUT /message/read/:conversationId
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId }         = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required." });
    }

    // Mark all unread messages not sent by this user as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });

    return res.status(200).json({ success: true, message: "Messages marked as read." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A MESSAGE
// DELETE /message/:messageId
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId }    = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }
    if (String(message.sender) !== String(userId)) {
      return res.status(403).json({ success: false, message: "You can only delete your own messages." });
    }

    await message.deleteOne();

    // Update lastMessage snapshot if this was the last message
    const latest = await Message.findOne({ conversation: message.conversation })
      .sort({ createdAt: -1 });

    await Conversation.findByIdAndUpdate(message.conversation, {
      lastMessage: latest
        ? { content: latest.content, sender: latest.sender, createdAt: latest.createdAt }
        : { content: "", sender: null, createdAt: null },
    });

    return res.status(200).json({ success: true, message: "Message deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A CONVERSATION
// DELETE /message/conversation/:conversationId
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId }         = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }
    const isParticipant = conversation.participants.some(p => String(p) === String(userId));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "You are not part of this conversation." });
    }

    // Delete all messages in the conversation then the conversation itself
    await Message.deleteMany({ conversation: conversationId });
    await conversation.deleteOne();

    return res.status(200).json({ success: true, message: "Conversation deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  deleteConversation,
};
