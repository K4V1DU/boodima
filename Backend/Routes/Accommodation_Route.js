const express = require("express");
const router = express.Router();

const {
  addAccommodation,
  getAllAccommodations,
  getAccommodationById,
  updateAccommodation,
  deleteAccommodation,
} = require("../Controllers/Accommodation_Controller");

// Create
router.post("/", addAccommodation);

// Read All
router.get("/", getAllAccommodations);

// Read One
router.get("/:id", getAccommodationById);

// Update
router.put("/:id", updateAccommodation);

// Delete
router.delete("/:id", deleteAccommodation);

module.exports = router;
