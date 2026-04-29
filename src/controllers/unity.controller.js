const unityService = require('../services/unity.service');
const { success } = require('../utils/response');

// GET /unity/partners
async function listPartners(req, res, next) {
  try {
    const result = await unityService.listActivePartners();
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// GET /unity/partners/:identifier/showroom
async function getShowroom(req, res, next) {
  try {
    const result = await unityService.getShowroomByIdentifier(req.params.identifier);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// PUT /unity/partners/:identifier/showroom
async function saveShowroom(req, res, next) {
  try {
    if (!req.body.showroom || typeof req.body.showroom !== 'object') {
      return res.status(400).json({ error: 'showroom must be a JSON object' });
    }
    const result = await unityService.saveShowroomByIdentifier(req.params.identifier, req.body.showroom);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// GET /unity/partners/:identifier/media
async function getPartnerMedia(req, res, next) {
  try {
    const result = await unityService.getMediaByIdentifier(req.params.identifier);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// GET /unity/world
async function getWorld(req, res, next) {
  try {
    const result = await unityService.getAllPartnersWorld();
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listPartners, getShowroom, saveShowroom, getPartnerMedia, getWorld };
