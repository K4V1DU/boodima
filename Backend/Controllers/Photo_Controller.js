const Photo = require("../Models/Photo");

// ==============================
// Add New Photo
// ==============================
// Used by handlePhotoUpload in React
const addPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const photo = new Photo({
      data: req.file.buffer, // Storing binary data in DB
      contentType: req.file.mimetype,
      order: req.body.order || 0,
    });

    await photo.save();

    res.status(201).json({
      success: true,
      message: "Photo uploaded successfully",
      data: {
        _id: photo._id,
        order: photo.order
      },
    });
  } catch (err) {
    console.error("Add Photo Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Get Photo Binary (For Preview)
// ==============================
// Used to display the image: <img src="http://localhost:5000/Photo/ID" />
const getPhotoById = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    res.set("Content-Type", photo.contentType);
    res.status(200).send(photo.data);
  } catch (err) {
    console.error("Get Photo By ID Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Update Photo
// ==============================
// Used by handlePhotoUpdate in React
const updatePhoto = async (req, res) => {
  try {
    const updateData = {};
    if (req.file) {
      updateData.data = req.file.buffer;
      updateData.contentType = req.file.mimetype;
    }
    if (req.body.order !== undefined) {
      updateData.order = req.body.order;
    }

    const updated = await Photo.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Photo updated successfully",
      data: {
        _id: updated._id,
        order: updated.order
      },
    });
  } catch (err) {
    console.error("Update Photo Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Delete Photo
// ==============================
// Used by handleDeletePhoto in React
const deletePhoto = async (req, res) => {
  try {
    const deleted = await Photo.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Photo deleted successfully from database",
    });
  } catch (err) {
    console.error("Delete Photo Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Get All Photo IDs
// ==============================
const getAllPhotosID = async (req, res) => {
  try {
    const photos = await Photo.find().select("_id"); 
    const photoIds = photos.map(photo => photo._id);

    res.status(200).json({
      success: true,
      count: photoIds.length,
      data: photoIds,
    });
  } catch (err) {
    console.error("Get All Photo IDs Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  addPhoto,
  getAllPhotosID,
  getPhotoById,
  updatePhoto,
  deletePhoto,
};