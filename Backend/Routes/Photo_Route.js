const express = require("express");
const router = express.Router();
const multer = require("multer"); // <-- Add this
const {
  addPhoto,
  getAllPhotosID,
  getPhotoById,
  updatePhoto,
  deletePhoto
} = require("../Controllers/Photo_Controller");

// Multer setup (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB limit

// Routes
router.post("/", upload.single("photo"), addPhoto); 
router.get("/", getAllPhotosID);
router.get("/:id", getPhotoById);
router.put("/:id", upload.single("photo"), updatePhoto);
router.delete("/:id", deletePhoto);

module.exports = router;
