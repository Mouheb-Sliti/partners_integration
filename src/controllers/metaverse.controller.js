const metaverseService = require('../services/metaverse.service');
const { success } = require('../utils/response');

async function getEligiblePartners(req, res, next) {
  try {
    const partners = await metaverseService.getEligiblePartners();
    success(res, { count: partners.length, partners });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEligiblePartners };
