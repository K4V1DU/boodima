const express = require("express");
const router  = express.Router();

const {
  addFavourite,
  removeFavourite,
  getUserFavourites,
  checkFavourite,
  getFavouriteCount,
} = require("../Controllers/Favourite_Controller");

// Add / Remove
router.post("/",    addFavourite);
router.delete("/",  removeFavourite);

// Get all favourites for a user  →  GET /favourite/:userId?itemType=Accommodation
router.get("/:userId", getUserFavourites);

// Check if a specific item is favourited  →  GET /favourite/check/:userId/:itemId/:itemType
router.get("/check/:userId/:itemId/:itemType", checkFavourite);

// Get favourite count for an item  →  GET /favourite/count/:itemId/:itemType
router.get("/count/:itemId/:itemType", getFavouriteCount);

module.exports = router;
