const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
  changePassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  addFavorite,
  removeFavorite,
} = require("../Controllers/User_Controller");

// Auth
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// OTP - Register
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Forgot Password
router.post("/ForgotPassword", forgotPasswordSendOtp);
router.post("/forgot-password/verify-otp", forgotPasswordVerifyOtp);
router.post("/reset-password", resetPassword);

// User CRUD
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Change Password
router.put("/:id/change-password", changePassword);

// Favorites
router.post("/favorites/add", addFavorite);
router.post("/favorites/remove", removeFavorite);

module.exports = router;