// routes/Notification_Route.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../Controllers/Notification_Controller");

// POST /Notification                         — insert a notification
router.post("/",                   ctrl.insertNotification);

// GET  /Notification?userId=xxx              — list + unread count
router.get("/",                    ctrl.getNotifications);

// GET  /Notification/unread-count?userId=xxx — badge count only
router.get("/unread-count",        ctrl.getUnreadCount);

// PATCH /Notification/read-all?userId=xxx   — mark all read
router.patch("/read-all",          ctrl.markAllRead);

// DELETE /Notification/clear-all?userId=xxx — delete all
router.delete("/clear-all",        ctrl.clearAll);

// PATCH  /Notification/:id/read             — mark one read
router.patch("/:id/read",          ctrl.markOneRead);

// DELETE /Notification/:id                  — delete one
router.delete("/:id",              ctrl.deleteOne);

module.exports = router;