// controllers/Notification_Controller.js
const Notification = require("../Models/Notification");

// ─── Helper ───────────────────────────────────────────────────────────────────
// Call this from any other controller to create a notification.
//
// Example:
//   const { createNotification } = require("./Notification_Controller");
//   await createNotification({
//     recipient: order.studentId,
//     type:      "order_status",
//     title:     "Order Accepted",
//     message:   "Your order from Mama's Kitchen has been accepted.",
//     link:      "/StudentOrders",
//     refId:     order._id,
//     refType:   "FoodOrder",
//   });
// ─────────────────────────────────────────────────────────────────────────────
exports.createNotification = async ({
  recipient, type, title, message, link = null, refId = null, refType = null,
}) => {
  try {
    await Notification.create({ recipient, type, title, message, link, refId, refType });
  } catch (err) {
    // Never let a notification failure break the main flow
  }
};

// ─── GET /Notification?userId=xxx  ───────────────────────────────────────────
// Returns paginated notifications for a user, newest first.
exports.getNotifications = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required." });

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    res.json({ success: true, notifications, unreadCount, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
};

// ─── GET /Notification/unread-count?userId=xxx ────────────────────────────────
// Lightweight endpoint polled every 30s by the navbar bell.
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, count: 0 });
    const count = await Notification.countDocuments({ recipient: userId, read: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, count: 0 });
  }
};

// ─── PATCH /Notification/:id/read ────────────────────────────────────────────
exports.markOneRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── PATCH /Notification/read-all?userId=xxx ─────────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required." });
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── DELETE /Notification/:id ────────────────────────────────────────────────
exports.deleteOne = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── DELETE /Notification/clear-all?userId=xxx ───────────────────────────────
exports.clearAll = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required." });
    await Notification.deleteMany({ recipient: userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── POST /Notification  (HTTP endpoint for inserting via Postman / other controllers) ──
exports.insertNotification = async (req, res) => {
  try {
    const { recipient, type, title, message, link, refId, refType } = req.body;
    if (!recipient || !type || !title || !message)
      return res.status(400).json({ success: false, message: "recipient, type, title and message are required." });

    const notification = await Notification.create({
      recipient, type, title, message,
      link:    link    || null,
      refId:   refId   || null,
      refType: refType || null,
    });
    res.status(201).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
};