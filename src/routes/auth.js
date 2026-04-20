const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const config = require('../config');
const { registerRules, loginRules, updateProfileRules, changePasswordRules } = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Multer config for profile pic
fs.mkdirSync(config.upload.dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.upload.dir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});
const uploadProfilePic = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// POST /auth/register
router.post('/register', registerRules, validate, authController.register);

// POST /auth/login
router.post('/login', loginRules, validate, authController.login);

// GET /auth/me
router.get('/me', authenticate, authController.getMe);

// PUT /auth/profile — update partner profile
router.put('/profile', authenticate, updateProfileRules, validate, authController.updateProfile);

// PUT /auth/password — change password
router.put('/password', authenticate, changePasswordRules, validate, authController.changePassword);

// POST /auth/profile-pic — upload profile picture
router.post('/profile-pic', authenticate, uploadProfilePic.single('profilePic'), authController.updateProfilePic);

module.exports = router;
