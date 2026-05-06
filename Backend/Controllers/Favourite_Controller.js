const Favourite = require("../Models/Favourite");

// ─── Add to Favourites ────────────────────────────────────────────────────────
// POST /favourite
const addFavourite = async (req, res) => {
  try {
    const { user, itemId, itemType } = req.body;

    if (!user || !itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: "user, itemId, and itemType are required.",
      });
    }

    const favourite = await Favourite.create({ user, itemId, itemType });

    return res.status(201).json({
      success: true,
      message: "Added to favourites.",
      data: favourite,
    });
  } catch (err) {
    // Duplicate key — already favourited
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item is already in favourites.",
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Remove from Favourites ───────────────────────────────────────────────────
// DELETE /favourite
const removeFavourite = async (req, res) => {
  try {
    const { user, itemId, itemType } = req.body;

    if (!user || !itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: "user, itemId, and itemType are required.",
      });
    }

    const deleted = await Favourite.findOneAndDelete({ user, itemId, itemType });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Favourite not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Removed from favourites.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get All Favourites for a User ───────────────────────────────────────────
// GET /favourite/:userId
const getUserFavourites = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemType } = req.query; // optional filter: ?itemType=Accommodation

    const query = { user: userId };
    if (itemType) query.itemType = itemType;

    const favourites = await Favourite.find(query)
      .populate("itemId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: favourites.length,
      data: favourites,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Check if an Item is Favourited ──────────────────────────────────────────
// GET /favourite/check/:userId/:itemId/:itemType
const checkFavourite = async (req, res) => {
  try {
    const { userId, itemId, itemType } = req.params;

    const favourite = await Favourite.findOne({
      user: userId,
      itemId,
      itemType,
    });

    return res.status(200).json({
      success: true,
      isFavourited: !!favourite,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Favourite Counts for an Item ────────────────────────────────────────
// GET /favourite/count/:itemId/:itemType
const getFavouriteCount = async (req, res) => {
  try {
    const { itemId, itemType } = req.params;

    const count = await Favourite.countDocuments({ itemId, itemType });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  addFavourite,
  removeFavourite,
  getUserFavourites,
  checkFavourite,
  getFavouriteCount,
};
