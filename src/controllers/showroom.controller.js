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

async function saveShowroom(req, res, next) {
  try {
    if (!req.body.showroom || typeof req.body.showroom !== 'object') {
      return res.status(400).json({ error: 'showroom must be a JSON object' });
    }
    const result = await showroomService.saveShowroom(req.partner.id, req.body.showroom);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getShowroom, saveShowroom };
