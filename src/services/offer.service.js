const Offer = require('../models/Offer');
const Subscription = require('../models/Subscription');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { recomputeVisibility } = require('./metaverse.service');

async function listOffers() {
  const offers = await Offer.find({ isActive: true })
    .select('name displayName description maxImages maxVideos max3dObjects')
    .sort('name');
  return { offers };
}

async function subscribe(partnerId, offerId) {
  if (!offerId) {
    throw new ValidationError('offer_id is required');
  }

  const offer = await Offer.findOne({ _id: offerId, isActive: true });
  if (!offer) {
    throw new NotFoundError('Offer');
  }

  const subscription = await Subscription.findOneAndUpdate(
    { partner: partnerId },
    { offer: offerId, subscribedAt: new Date() },
    { upsert: true, new: true }
  );

  // Recompute metaverse visibility after subscription change
  await recomputeVisibility(partnerId);

  return {
    subscription: {
      id: subscription._id,
      offerId: offer._id,
      offerName: offer.name,
      displayName: offer.displayName,
      subscribedAt: subscription.subscribedAt,
    },
  };
}

async function getMySubscription(partnerId) {
  const subscription = await Subscription.findOne({ partner: partnerId }).populate('offer');
  if (!subscription) {
    throw new NotFoundError('No active subscription');
  }

  return {
    subscription: {
      id: subscription._id,
      offerId: subscription.offer._id,
      offerName: subscription.offer.name,
      displayName: subscription.offer.displayName,
      maxImages: subscription.offer.maxImages,
      maxVideos: subscription.offer.maxVideos,
      max3dObjects: subscription.offer.max3dObjects,
      subscribedAt: subscription.subscribedAt,
    },
  };
}

module.exports = { listOffers, subscribe, getMySubscription };
