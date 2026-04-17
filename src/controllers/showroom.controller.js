const showroomService = require('../services/showroom.service');
const { success } = require('../utils/response');

async function getShowroom(req, res, next) {
  try {
    const result = await showroomService.getShowroom(req.partner.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function updateLayout(req, res, next) {
  try {
    const result = await showroomService.updateLayout(req.partner.id, req.body.layoutConfig);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function updateSlots(req, res, next) {
  try {
    const result = await showroomService.updateSlots(req.partner.id, req.body.slots);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getShowroom, updateLayout, updateSlots };
