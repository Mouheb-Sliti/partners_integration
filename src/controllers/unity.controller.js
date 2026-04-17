const unityService = require('../services/unity.service');
const { success } = require('../utils/response');

async function listPartners(req, res, next) {
  try {
    const result = await unityService.listActivePartners();
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getPartnerShowroom(req, res, next) {
  try {
    const result = await unityService.getPartnerShowroom(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getPartnerContent(req, res, next) {
  try {
    const result = await unityService.getPartnerContent(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listPartners, getPartnerShowroom, getPartnerContent };
