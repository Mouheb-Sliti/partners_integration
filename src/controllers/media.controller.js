const mediaService = require('../services/media.service');
const config = require('../config');
const { success, created } = require('../utils/response');

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
    const mode = req.body.mode || 'replace';
    const result = await mediaService.uploadMedia(req.partner.id, req.files, config.upload.dir, mode);
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
