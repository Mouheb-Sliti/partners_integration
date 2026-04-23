const mediaService = require('../services/media.service');
const config = require('../config');
const { success, created } = require('../utils/response');

const VALID_SLOTS = ['image1', 'image2', 'image3', 'image4', 'video1', 'video2', '3d_image', 'profile_image'];

async function listMedia(req, res, next) {
  try {
    const result = await mediaService.listMedia(req.partner.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function uploadMedia(req, res, next) {
  try {
    // Find which slot was sent
    const slot = VALID_SLOTS.find((s) => req.files[s] && req.files[s].length > 0);
    if (!slot) {
      return res.status(400).json({ error: 'No valid file field provided. Use one of: ' + VALID_SLOTS.join(', ') });
    }
    const file = req.files[slot][0];
    const result = await mediaService.uploadMedia(req.partner.id, file, slot, config.upload.dir);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

async function deleteMedia(req, res, next) {
  try {
    const result = await mediaService.deleteMedia(req.partner.id, req.params.id, config.upload.dir);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMedia, uploadMedia, deleteMedia };
