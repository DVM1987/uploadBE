const express = require("express");
const router = express.Router();
const {
  register,
  login,
  checkLoginStatus,
  logout,
  uploadImages,
  getAllImages,  
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/check-login-status", checkLoginStatus);
router.post("/logout", logout);
router.post("/upload-images", uploadImages);
router.get("/images", getAllImages); // Add this line
// router.delete('/logout', authenticateUser, logout);
// router.post('/verify-email', verifyEmail);
// router.post('/reset-password', resetPassword);
// router.post('/forgot-password', forgotPassword);

module.exports = router;
