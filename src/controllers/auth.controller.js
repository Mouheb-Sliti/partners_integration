const authService = require('../services/auth.service');
const { success, created } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { email, password, company_name } = req.body;
    const result = await authService.register({ email, password, companyName: company_name });
    created(res, result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await authService.getProfile(req.partner.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await authService.updateProfile(req.partner.id, req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.partner.id, { currentPassword, newPassword });
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function updateProfilePic(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const result = await authService.updateProfilePic(req.partner.id, filePath);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, updateProfile, updateProfilePic, changePassword };
