const User       = require("../Models/User");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;

// ── Cloudinary Config ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Constants ─────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME          = 15 * 60 * 1000; // 15 minutes

// ── Token Helpers ─────────────────────────────────────────────────
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

const refreshCookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "Strict",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── OTP email sender ──────────────────────────────────────────────
const sendOtpEmail = async (email, otp, subject = "Your UniSewana OTP Code") => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "uniniwasa@gmail.com",
      pass: "xlgojzowxvflzunh",
    },
  });

  const htmlContent = 
    '<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px;">' +
    '<h2 style="color:#e67e22;">UniSewana Email Verification</h2>' +
    '<p>Use the OTP below to complete your request. It expires in <strong>5 minutes</strong>.</p>' +
    '<div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#c8541a;margin:24px 0;">' + otp + '</div>' +
    '<p style="color:#999;font-size:12px;">If you did not request this, you can safely ignore this email.</p>' +
    '</div>';

  await transporter.sendMail({
    from:    '"UniSewana" <uniniwasa@gmail.com>',
    to:      email,
    subject,
    html:    htmlContent,
  });
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────────────────────────────
// Send OTP - Register
// ─────────────────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required." });

    if (role === "student" && !email.endsWith("@my.sliit.lk"))
      return res.status(400).json({ success: false, message: "Students must use their SLIIT email (@my.sliit.lk)." });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    global.pendingOtps          = global.pendingOtps || {};
    global.pendingOtps[email]   = { code: otp, expiresAt };

    await sendOtpEmail(email, otp, "Your UniSewana Register OTP Code");
    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Verify OTP - Register
// ─────────────────────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const pending        = global.pendingOtps?.[email];

    if (!pending)
      return res.status(400).json({ success: false, message: "No OTP found for this email. Please request a new one." });
    if (pending.code !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    if (new Date() > new Date(pending.expiresAt)) {
      delete global.pendingOtps[email];
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    global.pendingOtps[email].verified = true;
    res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { name, username, email, password, phone, address, role, profileImage, about } = req.body;

    if (!name || !username || !email || !password || !role)
      return res.status(400).json({ success: false, message: "All required fields must be filled." });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: "Invalid email address." });

    if (role === "student" && !email.endsWith("@my.sliit.lk"))
      return res.status(400).json({ success: false, message: "Students must use their SLIIT email (@my.sliit.lk)." });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
    if (!passwordRegex.test(password))
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters, numbers, and a special character." });

    if (phone && !/^0\d{9}$/.test(phone))
      return res.status(400).json({ success: false, message: "Phone number must be 10 digits and start with 0 (e.g. 0771234567)." });

    const pending = global.pendingOtps?.[email];
    if (!pending || !pending.verified)
      return res.status(400).json({ success: false, message: "Please verify your email with the OTP first." });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ success: false, message: "Username already taken. Please choose another." });

    const user = new User({
      name, username, email, password,
      phone, address, role, profileImage, about,
      "isVerified.email": true,
      ...(role === "host" && { "stats.hostSince": new Date() }),
    });

    await user.save();
    delete global.pendingOtps[email];

    res.status(201).json({ success: true, message: "User registered successfully.", data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid credentials." });

    // Account lock check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();
        return res.status(423).json({ success: false, message: "Too many failed attempts. Account locked for 15 minutes." });
      }
      const remaining = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
      await user.save();
      return res.status(400).json({
        success: false,
        message: `Invalid credentials. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
      });
    }

    // Success — reset lockout
    user.loginAttempts = 0;
    user.lockUntil     = null;

    // Generate tokens
    const accessToken  = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    res.status(200).json({
      success:     true,
      message:     "Login successful.",
      token:       accessToken,        // ✅ "token" key — matches Login.js localStorage.setItem("token")
      accessToken,                     // ✅ also send as accessToken for AxiosInstance
      data: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        profileImage: user.profileImage,
        username:     user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Refresh Token
// ─────────────────────────────────────────────────────────────────
const refreshTokenHandler = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token)
      return res.status(401).json({ success: false, message: "No refresh token provided." });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token)
      return res.status(401).json({ success: false, message: "Refresh token revoked. Please login again." });

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.status(200).json({ success: true, accessToken: newAccessToken, token: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────
const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await User.findOneAndUpdate(
        { refreshToken: token },
        { refreshToken: null }
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Forgot Password - Send OTP
// ─────────────────────────────────────────────────────────────────
const forgotPasswordSendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email." });

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    global.forgotOtps        = global.forgotOtps || {};
    global.forgotOtps[email] = { code: otp, expiresAt };

    await sendOtpEmail(email, otp, "UniSewana Password Reset OTP");
    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Forgot Password - Verify OTP
// ─────────────────────────────────────────────────────────────────
const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const pending        = global.forgotOtps?.[email];

    if (!pending)
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    if (pending.code !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    if (new Date() > new Date(pending.expiresAt)) {
      delete global.forgotOtps[email];
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    global.forgotOtps[email].verified = true;
    res.status(200).json({ success: true, message: "OTP verified." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Forgot Password - Reset Password
// ─────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ success: false, message: "Email and new password are required." });

    const pending = global.forgotOtps?.[email];
    if (!pending || !pending.verified)
      return res.status(400).json({ success: false, message: "Please verify your OTP first." });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
    if (!passwordRegex.test(newPassword))
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters, numbers, and a special character." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    user.password      = newPassword;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    delete global.forgotOtps[email];
    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Current and new password are required." });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Current password is incorrect." });

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame)
      return res.status(400).json({ success: false, message: "New password cannot be the same as your current password." });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
    if (!passwordRegex.test(newPassword))
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include letters, numbers, and a special character." });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Upload Profile Image (Cloudinary)
// ─────────────────────────────────────────────────────────────────
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file)
      return res.status(400).json({ success: false, message: "No image file provided." });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "unisewana/profiles", transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }] },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: result.secure_url },
      { new: true }
    ).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "Profile image updated.", profileImage: result.secure_url, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Image upload failed." });
  }
};

// ─────────────────────────────────────────────────────────────────
// User CRUD
// ─────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshToken");
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -refreshToken")
      .populate("favorites")
      .populate("reviews");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, phone, address, profileImage, about, languages, interests } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, address, profileImage, about, languages, interests },
      { new: true }
    ).select("-password -refreshToken");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "User updated successfully.", data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────
// Favorites
// ─────────────────────────────────────────────────────────────────
const addFavorite = async (req, res) => {
  try {
    const { userId, accommodationId } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!user.favorites.includes(accommodationId)) {
      user.favorites.push(accommodationId);
      await user.save();
    }
    res.status(200).json({ success: true, message: "Added to favorites.", data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { userId, accommodationId } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    user.favorites = user.favorites.filter((id) => id.toString() !== accommodationId);
    await user.save();
    res.status(200).json({ success: true, message: "Removed from favorites.", data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokenHandler,
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
  changePassword,
  uploadProfileImage,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  addFavorite,
  removeFavorite,
};