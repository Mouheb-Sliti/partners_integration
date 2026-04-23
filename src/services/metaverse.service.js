const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Media = require('../models/Media');
const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');

/**
 * Returns eligible partners visible in the metaverse.
 * Uses the pre-computed isVisibleInMetaverse flag.
 */
async function getEligiblePartners() {
  const partners = await Partner.find({ isActive: true, isVisibleInMetaverse: true })
    .select('companyName profilePic')
    .populate('profilePic', 'url');

  return partners.map((p) => ({
    partnerId: p._id,
    companyName: p.companyName,
    profilePic: p.profilePic?.url || null,
  }));
}

/**
 * Recompute and persist the isVisibleInMetaverse flag for a single partner.
 * A partner is visible when:
 *   1. Partner is active
 *   2. Has an active subscription
 *   3. Has a showroom
 *   4. Has at least 1 media in a slot allowed by the subscription offer
 */
async function recomputeVisibility(partnerId) {
  const partner = await Partner.findById(partnerId);
  if (!partner || !partner.isActive) {
    await Partner.updateOne({ _id: partnerId }, { isVisibleInMetaverse: false });
    return false;
  }

  // Check subscription to an active offer
  const sub = await Subscription.findOne({ partner: partnerId }).populate('offer');
  if (!sub || !sub.offer || !sub.offer.isActive) {
    await Partner.updateOne({ _id: partnerId }, { isVisibleInMetaverse: false });
    return false;
  }

  // Check showroom exists
  const showroom = await Showroom.findOne({ partner: partnerId });
  if (!showroom) {
    await Partner.updateOne({ _id: partnerId }, { isVisibleInMetaverse: false });
    return false;
  }

  // Determine allowed slots from offer limits
  const allowedSlots = [];
  for (let i = 1; i <= sub.offer.maxImages; i++) allowedSlots.push(`image${i}`);
  for (let i = 1; i <= sub.offer.maxVideos; i++) allowedSlots.push(`video${i}`);
  if (sub.offer.max3dObjects > 0) allowedSlots.push('3dmodel');

  // Check at least 1 media exists in an allowed slot
  const visibleCount = await Media.countDocuments({
    partner: partnerId,
    slot: { $in: allowedSlots },
  });

  const isVisible = visibleCount > 0;
  await Partner.updateOne({ _id: partnerId }, { isVisibleInMetaverse: isVisible });
  return isVisible;
}

module.exports = { getEligiblePartners, recomputeVisibility };
