const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const Subscription = require('../models/Subscription');
const Media = require('../models/Media');
const { NotFoundError } = require('../utils/errors');

async function listActivePartners() {
  const partners = await Partner.find({ isActive: true }).select('companyName createdAt');

  const partnerIds = partners.map((p) => p._id);
  const subscriptions = await Subscription.find({ partner: { $in: partnerIds } }).populate('offer', 'name displayName');

  const subMap = {};
  for (const s of subscriptions) {
    subMap[s.partner.toString()] = {
      offerName: s.offer.name,
      displayName: s.offer.displayName,
    };
  }

  const result = partners.map((p) => ({
    id: p._id,
    companyName: p.companyName,
    subscription: subMap[p._id.toString()] || null,
    createdAt: p.createdAt,
  }));

  return { partners: result };
}

async function getPartnerShowroom(partnerId) {
  const partner = await Partner.findOne({ _id: partnerId, isActive: true }).select('companyName');
  if (!partner) {
    throw new NotFoundError('Partner');
  }

  const showroom = await Showroom.findOne({ partner: partnerId })
    .populate('image_panels.panel_01.media')
    .populate('image_panels.panel_02.media')
    .populate('image_panels.panel_03.media')
    .populate('image_panels.panel_04.media')
    .populate('video_panels.panel_01.media')
    .populate('video_panels.panel_02.media')
    .populate('model_3d.media');

  if (!showroom) {
    throw new NotFoundError('Showroom');
  }

  const subscription = await Subscription.findOne({ partner: partnerId }).populate('offer');

  const formatPanel = (panel) => ({
    enabled: panel?.enabled || false,
    url: panel?.media?.url || null,
    originalName: panel?.media?.originalName || null,
  });

  return {
    partner: { id: partner._id, companyName: partner.companyName },
    showroom_design: showroom.showroom_design,
    image_panels: {
      base_color: showroom.image_panels?.base_color || '000000',
      scale: showroom.image_panels?.scale || 1.2,
      panel_01: formatPanel(showroom.image_panels?.panel_01),
      panel_02: formatPanel(showroom.image_panels?.panel_02),
      panel_03: formatPanel(showroom.image_panels?.panel_03),
      panel_04: formatPanel(showroom.image_panels?.panel_04),
    },
    video_panels: {
      base_color: showroom.video_panels?.base_color || '000000',
      scale: showroom.video_panels?.scale || 1,
      panel_01: formatPanel(showroom.video_panels?.panel_01),
      panel_02: formatPanel(showroom.video_panels?.panel_02),
    },
    '3d_model': {
      enabled: showroom.model_3d?.enabled || false,
      scale: showroom.model_3d?.scale || 1,
      url: showroom.model_3d?.media?.url || null,
      originalName: showroom.model_3d?.media?.originalName || null,
    },
    offer: subscription
      ? {
          name: subscription.offer.name,
          limits: {
            maxImages: subscription.offer.maxImages,
            maxVideos: subscription.offer.maxVideos,
            max3dObjects: subscription.offer.max3dObjects,
          },
        }
      : null,
  };
}

module.exports = { listActivePartners, getPartnerShowroom, getPartnerContent };

/**
 * GET /unity/partners/:id/content
 * Returns the full partner content for Unity: profile, subscription, media library, and showroom settings.
 */
async function getPartnerContent(partnerId) {
  // ── Profile ──
  const partner = await Partner.findOne({ _id: partnerId, isActive: true })
    .select('-passwordHash');
  if (!partner) throw new NotFoundError('Partner');

  // ── Subscription + Offer ──
  const subscription = await Subscription.findOne({ partner: partnerId }).populate('offer');

  // ── Media Library ──
  const allMedia = await Media.find({ partner: partnerId }).sort({ createdAt: 1 });

  const images = allMedia.filter((m) => m.type === 'image');
  const videos = allMedia.filter((m) => m.type === 'video');
  const objects3d = allMedia.filter((m) => m.type === '3d_object');

  // ── Showroom (new schema → populate media refs) ──
  const showroom = await Showroom.findOne({ partner: partnerId })
    .populate('image_panels.panel_01.media')
    .populate('image_panels.panel_02.media')
    .populate('image_panels.panel_03.media')
    .populate('image_panels.panel_04.media')
    .populate('video_panels.panel_01.media')
    .populate('video_panels.panel_02.media')
    .populate('model_3d.media');

  // Build Unity-compatible showroom block
  const formatPanel = (panel) => ({
    enabled: panel?.enabled || false,
    url: panel?.media?.url || null,
    originalName: panel?.media?.originalName || null,
  });

  const showroomBlock = showroom
    ? {
        showroom_design: showroom.showroom_design,
        image_panels: {
          base_color: showroom.image_panels?.base_color || '000000',
          scale: showroom.image_panels?.scale || 1.2,
          panel_01: formatPanel(showroom.image_panels?.panel_01),
          panel_02: formatPanel(showroom.image_panels?.panel_02),
          panel_03: formatPanel(showroom.image_panels?.panel_03),
          panel_04: formatPanel(showroom.image_panels?.panel_04),
        },
        video_panels: {
          base_color: showroom.video_panels?.base_color || '000000',
          scale: showroom.video_panels?.scale || 1,
          panel_01: formatPanel(showroom.video_panels?.panel_01),
          panel_02: formatPanel(showroom.video_panels?.panel_02),
        },
        '3d_model': {
          enabled: showroom.model_3d?.enabled || false,
          scale: showroom.model_3d?.scale || 1,
          url: showroom.model_3d?.media?.url || null,
          originalName: showroom.model_3d?.media?.originalName || null,
        },
        createdAt: showroom.createdAt,
        updatedAt: showroom.updatedAt,
      }
    : null;

  return {
    profile: partner,
    subscription: subscription
      ? {
          _id: subscription._id,
          offer: subscription.offer,
          subscribedAt: subscription.subscribedAt,
        }
      : null,
    media: {
      images,
      videos,
      objects3d,
      counts: {
        images: images.length,
        videos: videos.length,
        objects3d: objects3d.length,
        total: allMedia.length,
      },
    },
    showroom: showroomBlock,
  };
}
