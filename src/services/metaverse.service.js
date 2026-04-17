const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Media = require('../models/Media');
const Partner = require('../models/Partner');

/**
 * Returns eligible partners with their visible media projected through offer limits.
 * Uses aggregation to avoid N+1 queries.
 */
async function getEligiblePartners() {
  const results = await Subscription.aggregate([
    // Step 1: Only active subscriptions
    {
      $lookup: {
        from: 'offers',
        localField: 'offer',
        foreignField: '_id',
        as: 'offerData',
      },
    },
    { $unwind: '$offerData' },
    { $match: { 'offerData.isActive': true } },

    // Step 2: Lookup partner info
    {
      $lookup: {
        from: 'partners',
        localField: 'partner',
        foreignField: '_id',
        as: 'partnerData',
      },
    },
    { $unwind: '$partnerData' },
    { $match: { 'partnerData.isActive': true } },

    // Step 3: Lookup all media for this partner
    {
      $lookup: {
        from: 'media',
        localField: 'partner',
        foreignField: 'partner',
        as: 'allMedia',
      },
    },

    // Step 4: Compute stored counts per type
    {
      $addFields: {
        storedImages: {
          $size: { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', 'image'] } } },
        },
        storedVideos: {
          $size: { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', 'video'] } } },
        },
        stored3D: {
          $size: { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', '3d_object'] } } },
        },
      },
    },

    // Step 5: Must have at least 1 stored media
    {
      $match: {
        $expr: { $gt: [{ $add: ['$storedImages', '$storedVideos', '$stored3D'] }, 0] },
      },
    },

    // Step 6: Apply offer projection
    {
      $addFields: {
        visibleImages: { $min: ['$storedImages', '$offerData.maxImages'] },
        visibleVideos: { $min: ['$storedVideos', '$offerData.maxVideos'] },
        visible3D: { $min: ['$stored3D', '$offerData.max3dObjects'] },
      },
    },

    // Step 7: Must have at least 1 visible media after projection
    {
      $match: {
        $expr: {
          $gt: [{ $add: ['$visibleImages', '$visibleVideos', '$visible3D'] }, 0],
        },
      },
    },

    // Step 8: Slice media arrays to offer limits (return only visible items)
    {
      $addFields: {
        visibleMedia: {
          image: {
            $slice: [
              { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', 'image'] } } },
              { $min: ['$storedImages', '$offerData.maxImages'] },
            ],
          },
          video: {
            $slice: [
              { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', 'video'] } } },
              { $min: ['$storedVideos', '$offerData.maxVideos'] },
            ],
          },
          '3d_object': {
            $slice: [
              { $filter: { input: '$allMedia', as: 'm', cond: { $eq: ['$$m.type', '3d_object'] } } },
              { $min: ['$stored3D', '$offerData.max3dObjects'] },
            ],
          },
        },
      },
    },

    // Step 9: Lookup showroom
    {
      $lookup: {
        from: 'showrooms',
        localField: 'partner',
        foreignField: 'partner',
        as: 'showroomData',
      },
    },

    // Step 10: Project final shape
    {
      $project: {
        _id: 0,
        partnerId: '$partnerData._id',
        companyName: '$partnerData.companyName',
        offer: {
          name: '$offerData.name',
          displayName: '$offerData.displayName',
        },
        media: {
          counts: {
            visibleImages: '$visibleImages',
            visibleVideos: '$visibleVideos',
            visible3D: '$visible3D',
          },
          items: '$visibleMedia',
        },
        showroom: { $arrayElemAt: ['$showroomData', 0] },
      },
    },
  ]);

  return results;
}

/**
 * Recompute and persist the isVisibleInMetaverse flag for a single partner.
 */
async function recomputeVisibility(partnerId) {
  const sub = await Subscription.findOne({ partner: partnerId }).populate('offer');

  let isVisible = false;

  if (sub && sub.offer && sub.offer.isActive) {
    const counts = await Media.aggregate([
      { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const stored = { image: 0, video: 0, '3d_object': 0 };
    for (const c of counts) {
      stored[c._id] = c.count;
    }

    const visibleImages = Math.min(stored.image, sub.offer.maxImages);
    const visibleVideos = Math.min(stored.video, sub.offer.maxVideos);
    const visible3D = Math.min(stored['3d_object'], sub.offer.max3dObjects);

    isVisible = (visibleImages + visibleVideos + visible3D) > 0;
  }

  await Partner.updateOne({ _id: partnerId }, { isVisibleInMetaverse: isVisible });

  return isVisible;
}

module.exports = { getEligiblePartners, recomputeVisibility };
