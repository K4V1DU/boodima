const express = require("express");
const router  = express.Router();

const {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  deleteConversation,
} = require("../Controllers/Message_Controller");

// ── Conversations ─────────────────────────────────────────────────────────────
// Get or create a conversation between two users
router.post("/conversation", getOrCreateConversation);

// Get all conversations for a user (inbox)
router.get("/conversations/:userId", getUserConversations);

// Delete a conversation and all its messages
router.delete("/conversation/:conversationId", deleteConversation);

// ── Messages ──────────────────────────────────────────────────────────────────
// Get messages in a conversation  →  GET /message/:conversationId?page=1&limit=30
router.get("/:conversationId", getMessages);

// Send a message
router.post("/send", sendMessage);

// Mark all messages in a conversation as read
router.put("/read/:conversationId", markMessagesAsRead);

// Delete a single message
router.delete("/:messageId", deleteMessage);

module.exports = router;
