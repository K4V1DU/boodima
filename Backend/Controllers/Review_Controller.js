const Review = require("../Models/Review");
const Accommodation = require("../Models/Accommodation");

// Helper: Recalculate rating for accommodation
const updateAccommodationRating = async (accommodationId) => {
  if (!accommodationId) return;

  const acc = await Accommodation.findById(accommodationId).populate("reviews");
  if (!acc) return;

  const allRatings = acc.reviews.map(r => r.rating);
  acc.ratingCount = allRatings.length;
  acc.ratingAverage = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0;
  await acc.save();
};

// ==============================
// Add review
// ==============================
const addReview = async (req, res) => {
  try {
    const { reviewer, accommodation, comment, rating, images } = req.body;

    if (!reviewer || !accommodation || !comment || !rating) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const review = new Review({ reviewer, accommodation, comment, rating, images });
    await review.save();

    await Accommodation.findByIdAndUpdate(accommodation, { $push: { reviews: review._id } });
    await updateAccommodationRating(accommodation);

    res.status(201).json({ success: true, message: "Review added", data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// Get review by ID
// ==============================
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("reviewer", "name profileImage createdAt");

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// Get all reviews
// ==============================
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewer", "name profileImage")
      .populate("accommodation", "title address");

    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// Update review
// ==============================
const updateReview = async (req, res) => {
  try {
    const { comment, rating, images } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (comment) review.comment = comment;
    if (rating)  review.rating  = rating;
    if (images)  review.images  = images;

    await review.save();
    await updateAccommodationRating(review.accommodation);

    res.json({ success: true, message: "Review updated", data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// Delete review
// ==============================
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    await Accommodation.findByIdAndUpdate(review.accommodation, { $pull: { reviews: review._id } });
    await updateAccommodationRating(review.accommodation);

    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  addReview,
  getReviewById,
  getReviews,
  updateReview,
  deleteReview,
};