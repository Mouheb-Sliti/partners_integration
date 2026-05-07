const mongoose = require('mongoose');
const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const Subscription = require('../models/Subscription');
const Media = require('../models/Media');
const showroomService = require('./showroom.service');
const { NotFoundError } = require('../utils/errors');

/**
 * Resolve a partner by ObjectId string or companyName (case-insensitive).
 * Only returns active partners.
 */
async function resolvePartner(identifier) {
  const isObjectId =
    typeof identifier === 'string' &&
    identifier.length === 24 &&
    mongoose.Types.ObjectId.isValid(identifier);

  const query = isObjectId
    ? { _id: identifier, isActive: true }
    : { companyName: new RegExp(`^${escapeRegex(identifier)}$`, 'i'), isActive: true };

  const partner = await Partner.findOne(query).select('_id companyName profilePic');
  if (!partner) throw new NotFoundError('Partner');
  return partner;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Public API 1: getPartners ─────────────────────────────────────────────────
/**
 * Returns all partners that are fully set up and visible in the metaverse.
 * isVisibleInMetaverse is true only when: active + subscription + showroom + media.
 * No auth required — consumed by Unity lobby.
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

// ── Public API 2: getShowroomSetting ──────────────────────────────────────────
/**
 * Returns the showroom design settings for a partner (by id or companyName).
 * No auth required — consumed by Unity for scene construction.
 */
async function getShowroomByIdentifier(identifier) {
  const partner = await resolvePartner(identifier);
  const showroom = await Showroom.findOne({ partner: partner._id });
  if (!showroom) throw new NotFoundError('Showroom');

  return {
    partnerId: partner._id,
    companyName: partner.companyName,
    showroom: {
      showroom_design: showroom.showroom_design,
      image_panels: showroom.image_panels,
      video_panels: showroom.video_panels,
      model_3d: showroom.model_3d,
    },
  };
}

// ── Public API 3: saveShowroomSetting ─────────────────────────────────────────
/**
 * Saves (upserts) the showroom design settings for a partner (by id or companyName).
 * Accepts the same structured JSON the partner dashboard sends.
 */
async function saveShowroomByIdentifier(identifier, showroomData) {
  const partner = await resolvePartner(identifier);
  return showroomService.saveShowroom(partner._id.toString(), showroomData);
}

// ── Public API 4: getPartnerMedia ─────────────────────────────────────────────
/**
 * Returns all uploaded media for a partner (by id or companyName),
 * filtered to slots allowed by their active subscription offer.
 */
async function getMediaByIdentifier(identifier) {
  const partner = await resolvePartner(identifier);

  const subscription = await Subscription.findOne({ partner: partner._id }).populate('offer');
  if (!subscription || !subscription.offer || !subscription.offer.isActive) {
    throw new NotFoundError('Active subscription');
  }

  const { maxImages, maxVideos, max3dObjects } = subscription.offer;

  const allowedSlots = [];
  for (let i = 1; i <= maxImages; i++) allowedSlots.push(`image${i}`);
  for (let i = 1; i <= maxVideos; i++) allowedSlots.push(`video${i}`);
  if (max3dObjects > 0) allowedSlots.push('3dmodel');

  const mediaList = await Media.find({ partner: partner._id, slot: { $in: allowedSlots } })
    .select('slot type url originalName mimeType fileSize productName price description')
    .sort({ slot: 1 });

  const bySlot = {};
  for (const m of mediaList) {
    bySlot[m.slot] = {
      url: m.url,
      type: m.type,
      originalName: m.originalName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      productName: m.productName || null,
      price: typeof m.price === 'number' ? m.price : null,
      description: m.description || null,
      descirption: m.description || null,
    };
  }

  return {
    partnerId: partner._id,
    companyName: partner.companyName,
    subscription: {
      offer: subscription.offer.name,
      limits: { maxImages, maxVideos, max3dObjects },
    },
    media: bySlot,
  };
}

module.exports = {
  listActivePartners,
  getShowroomByIdentifier,
  saveShowroomByIdentifier,
  getMediaByIdentifier,
  getAllPartnersWorld,
};

// ── Public API 5: getAllPartnersWorld ─────────────────────────────────────────
/**
 * Single mega-query: returns every visible partner with their full details,
 * showroom design, subscription info, and media — all in one response.
 * No auth required — primary feed for Unity world loading.
 */
async function getAllPartnersWorld() {
  // 1. Fetch all fully-visible partners
  const partners = await Partner.find({ isActive: true, isVisibleInMetaverse: true })
    .select('companyName profilePic address country city phone')
    .populate('profilePic', 'url originalName')
    .lean();

  if (partners.length === 0) return { total: 0, partners: [] };

  const partnerIds = partners.map((p) => p._id);

  // 2. Batch-fetch showrooms, subscriptions and media in parallel
  const [showrooms, subscriptions, allMedia] = await Promise.all([
    Showroom.find({ partner: { $in: partnerIds } }).lean(),
    Subscription.find({ partner: { $in: partnerIds } }).populate('offer').lean(),
    Media.find({ partner: { $in: partnerIds } })
      .select('partner slot type url originalName mimeType fileSize productName price description')
      .lean(),
  ]);

  // 3. Index by partnerId for O(1) lookup
  const showroomMap = {};
  for (const s of showrooms) showroomMap[s.partner.toString()] = s;

  const subscriptionMap = {};
  for (const s of subscriptions) subscriptionMap[s.partner.toString()] = s;

  const mediaMap = {};
  for (const m of allMedia) {
    const pid = m.partner.toString();
    if (!mediaMap[pid]) mediaMap[pid] = {};
    mediaMap[pid][m.slot] = {
      url: m.url,
      type: m.type,
      originalName: m.originalName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      productName: m.productName || null,
      price: typeof m.price === 'number' ? m.price : null,
      description: m.description || null,
      descirption: m.description || null,
    };
  }

  // 4. Assemble
  const result = partners.map((p) => {
    const pid = p._id.toString();
    const sub = subscriptionMap[pid];
    const offer = sub?.offer;
    const showroom = showroomMap[pid];

    const allowedSlots = [];
    if (offer) {
      for (let i = 1; i <= offer.maxImages; i++) allowedSlots.push(`image${i}`);
      for (let i = 1; i <= offer.maxVideos; i++) allowedSlots.push(`video${i}`);
      if (offer.max3dObjects > 0) allowedSlots.push('3dmodel');
    }

    const partnerMedia = mediaMap[pid] || {};
    const filteredMedia = {};
    for (const slot of allowedSlots) {
      if (partnerMedia[slot]) filteredMedia[slot] = partnerMedia[slot];
    }

    return {
      id: p._id,
      companyName: p.companyName,
      profilePic: p.profilePic?.url || null,
      address: {
        country: p.country || null,
        city: p.city || null,
      },
      subscription: offer
        ? {
            offer: offer.name,
            displayName: offer.displayName,
            limits: {
              maxImages: offer.maxImages,
              maxVideos: offer.maxVideos,
              max3dObjects: offer.max3dObjects,
            },
          }
        : null,
      showroom: showroom
        ? {
            showroom_design: showroom.showroom_design,
            image_panels: showroom.image_panels,
            video_panels: showroom.video_panels,
            model_3d: showroom.model_3d,
          }
        : null,
      media: filteredMedia,
    };
  });

  return { total: result.length, partners: result };
}
