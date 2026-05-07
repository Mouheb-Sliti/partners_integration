const mediaService = require('../services/media.service');
const config = require('../config');
const { success, created } = require('../utils/response');

const VALID_SLOTS = ['image1', 'image2', 'image3', 'image4', 'video1', 'video2', '3dmodel', 'profile_image'];

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
    const presentSlots = VALID_SLOTS.filter((s) => req.files[s] && req.files[s].length > 0);
    if (presentSlots.length === 0) {
      return res.status(400).json({ error: 'No valid file field provided. Use one of: ' + VALID_SLOTS.join(', ') });
    }

    const results = await Promise.all(
      presentSlots.map((slot) =>
        mediaService.uploadMedia(req.partner.id, req.files[slot][0], slot, config.upload.dir)
      )
    );

    created(res, results.length === 1 ? results[0] : results);
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

async function update3dModelMetadata(req, res, next) {
  try {
    const result = await mediaService.update3dModelMetadata(req.partner.id, req.body || {});
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMedia, uploadMedia, deleteMedia, update3dModelMetadata };
