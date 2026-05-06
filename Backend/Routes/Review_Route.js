const express = require("express");
const router = express.Router();
const { addReview, getReviewById, getReviews, updateReview, deleteReview } = require("../Controllers/Review_Controller");

router.get("/:id",  getReviewById); 
router.get("/",     getReviews);
router.post("/",    addReview);
router.put("/:id",  updateReview);
router.delete("/:id", deleteReview);

module.exports = router;
