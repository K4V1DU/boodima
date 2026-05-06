const express = require("express");
const router = express.Router();

const {
  createBooking,
  getStudentBookings,
  getHostBookings,
  updateBookingStatus,
  deleteBooking,
} = require("../Controllers/Booking_Controller");

// Create booking
router.post("/", createBooking);

// Get bookings
router.get("/student/:studentId", getStudentBookings);
router.get("/host/:hostId", getHostBookings);

// Update status
router.put("/:id", updateBookingStatus);

// Delete
router.delete("/:id", deleteBooking);

module.exports = router;