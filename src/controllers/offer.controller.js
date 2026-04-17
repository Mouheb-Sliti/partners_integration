const offerService = require('../services/offer.service');
const { success } = require('../utils/response');

async function listOffers(req, res, next) {
  try {
    const result = await offerService.listOffers();
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function subscribe(req, res, next) {
  try {
    const result = await offerService.subscribe(req.partner.id, req.body.offer_id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getMySubscription(req, res, next) {
  try {
    const result = await offerService.getMySubscription(req.partner.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listOffers, subscribe, getMySubscription };
