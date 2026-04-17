const { body } = require('express-validator');

const registerRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('company_name').trim().notEmpty().withMessage('Company name is required'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const updateProfileRules = [
  body('email').optional().isEmail().normalizeEmail(),
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

module.exports = { registerRules, loginRules, updateProfileRules, changePasswordRules };
