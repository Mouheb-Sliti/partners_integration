const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerRules, loginRules, updateProfileRules, changePasswordRules } = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

const router = express.Router();

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

module.exports = router;
