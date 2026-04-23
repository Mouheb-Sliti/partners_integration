const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const Subscription = require('../models/Subscription');
const Media = require('../models/Media');
const { NotFoundError } = require('../utils/errors');

/**
 * Unity API 1: List all active partners visible in the metaverse.
 * Returns companyName + profilePic URL for each.
 */
async function listActivePartners() {
  const partners = await Partner.find({ isActive: true, isVisibleInMetaverse: true })
    .select('companyName profilePic')
    .populate('profilePic', 'url');

  return {
    partners: partners.map((p) => ({
      id: p._id,
      companyName: p.companyName,
      profilePic: p.profilePic?.url || null,
    })),
  };
}

/**
 * Unity API 2: Get full partner content for Unity rendering.
 * Media and showroom panels are filtered by offer subscription limits.
 */
async function getPartnerContent(partnerId) {
  // ── Partner ──
  const partner = await Partner.findOne({ _id: partnerId, isActive: true, isVisibleInMetaverse: true })
    .select('companyName profilePic')
    .populate('profilePic', 'url originalName');
  if (!partner) throw new NotFoundError('Partner');

  // ── Subscription + Offer limits ──
  const subscription = await Subscription.findOne({ partner: partnerId }).populate('offer');
  if (!subscription || !subscription.offer) throw new NotFoundError('Subscription');

  const limits = {
    maxImages: subscription.offer.maxImages,
    maxVideos: subscription.offer.maxVideos,
    max3dObjects: subscription.offer.max3dObjects,
  };

  // ── Determine which slots are allowed by the offer ──
  const allowedSlots = [];
  for (let i = 1; i <= limits.maxImages; i++) allowedSlots.push(`image${i}`);
  for (let i = 1; i <= limits.maxVideos; i++) allowedSlots.push(`video${i}`);
  if (limits.max3dObjects > 0) allowedSlots.push('3d_image');

  // ── Fetch media for allowed slots only ──
  const media = await Media.find({ partner: partnerId, slot: { $in: allowedSlots } }).sort({ slot: 1 });
  const mediaBySlot = {};
  for (const m of media) {
    mediaBySlot[m.slot] = { url: m.url, originalName: m.originalName, type: m.type };
  }

  // ── Showroom settings ──
  const showroom = await Showroom.findOne({ partner: partnerId });

  const formatPanel = (panel, slotName) => {
    const isAllowed = allowedSlots.includes(slotName);
    const item = mediaBySlot[slotName];
    return {
      enabled: isAllowed && (panel?.enabled || false),
      url: isAllowed && item ? item.url : null,
      originalName: isAllowed && item ? item.originalName : null,
    };
  };

  return {
    partner: {
      id: partner._id,
      companyName: partner.companyName,
      profilePic: partner.profilePic?.url || null,
    },
    subscription: {
      offer: subscription.offer.name,
      displayName: subscription.offer.displayName,
      limits,
    },
    showroom: showroom
      ? {
          showroom_design: showroom.showroom_design,
          image_panels: {
            base_color: showroom.image_panels?.base_color || '000000',
            scale: showroom.image_panels?.scale || 1.2,
            panel_01: formatPanel(showroom.image_panels?.panel_01, 'image1'),
            panel_02: formatPanel(showroom.image_panels?.panel_02, 'image2'),
            panel_03: formatPanel(showroom.image_panels?.panel_03, 'image3'),
            panel_04: formatPanel(showroom.image_panels?.panel_04, 'image4'),
          },
          video_panels: {
            base_color: showroom.video_panels?.base_color || '000000',
            scale: showroom.video_panels?.scale || 1,
            panel_01: formatPanel(showroom.video_panels?.panel_01, 'video1'),
            panel_02: formatPanel(showroom.video_panels?.panel_02, 'video2'),
          },
          '3d_model': {
            enabled: allowedSlots.includes('3d_image') && (showroom.model_3d?.enabled || false),
            scale: showroom.model_3d?.scale || 1,
            url: mediaBySlot['3d_image']?.url || null,
            originalName: mediaBySlot['3d_image']?.originalName || null,
          },
        }
      : null,
    media: mediaBySlot,
  };
}

module.exports = { listActivePartners, getPartnerContent };
