const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const Media = require('../models/Media');
const Subscription = require('../models/Subscription');
const config = require('../config');
const { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { recomputeVisibility } = require('./metaverse.service');

async function register({ email, password, companyName }) {
  const existing = await Partner.findOne({ email });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const partner = await Partner.create({ email, passwordHash, companyName });

  // Auto-create an empty showroom for the new partner
  await Showroom.create({ partner: partner._id });

  const token = signToken(partner);

  return {
    token,
    partner: formatPartner(partner),
  };
}

async function login({ email, password }) {
  const partner = await Partner.findOne({ email });
  if (!partner) {
    throw new UnauthorizedError();
  }

  const valid = await bcrypt.compare(password, partner.passwordHash);
  if (!valid) {
    throw new UnauthorizedError();
  }

  if (!partner.isActive) {
    throw new ForbiddenError('Account is deactivated');
  }

  const token = signToken(partner);

  return {
    token,
    partner: formatPartner(partner),
  };
}

async function getProfile(partnerId) {
  const [partner, showroom, subscription, mediaDocs] = await Promise.all([
    Partner.findById(partnerId).select('-passwordHash').populate('profilePic'),
    Showroom.findOne({ partner: partnerId }),
    Subscription.findOne({ partner: partnerId }).populate('offer'),
    Media.find({ partner: partnerId }).sort({ slot: 1 }),
  ]);

  if (!partner) {
    throw new NotFoundError('Partner');
  }

  const mediaBySlot = {};
  for (const m of mediaDocs) {
    if (m.slot === 'profile_image') continue;

    mediaBySlot[m.slot] = {
      _id: m._id,
      url: m.url,
      type: m.type,
      originalName: m.originalName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      productName: m.productName ?? null,
      price: typeof m.price === 'number' ? m.price : null,
      description: m.description ?? null,
    };
  }

  return {
    partner,
    showroom: showroom
      ? {
          showroom_design: showroom.showroom_design,
          image_panels: showroom.image_panels,
          video_panels: showroom.video_panels,
          model_3d: showroom.model_3d,
        }
      : null,
    subscription: subscription?.offer
      ? {
          id: subscription._id,
          offerId: subscription.offer._id,
          offerName: subscription.offer.name,
          displayName: subscription.offer.displayName,
          maxImages: subscription.offer.maxImages,
          maxVideos: subscription.offer.maxVideos,
          max3dObjects: subscription.offer.max3dObjects,
          subscribedAt: subscription.subscribedAt,
        }
      : null,
    media: {
      total: mediaDocs.filter((m) => m.slot !== 'profile_image').length,
      profile_image: partner.profilePic
        ? { url: partner.profilePic.url, originalName: partner.profilePic.originalName }
        : null,
      items: mediaBySlot,
    },
  };
}

async function updateProfile(partnerId, updates) {
  const allowed = {};
  if (updates.companyName !== undefined) allowed.companyName = updates.companyName;
  if (updates.email !== undefined) {
    // Check uniqueness
    const existing = await Partner.findOne({ email: updates.email, _id: { $ne: partnerId } });
    if (existing) {
      throw new ConflictError('Email already in use');
    }
    allowed.email = updates.email;
  }
  if (updates.address !== undefined) allowed.address = updates.address;
  if (updates.country !== undefined) allowed.country = updates.country;
  if (updates.city !== undefined) allowed.city = updates.city;
  if (updates.phone !== undefined) allowed.phone = updates.phone;
  if (updates.zipCode !== undefined) allowed.zipCode = updates.zipCode;

  const partner = await Partner.findByIdAndUpdate(partnerId, allowed, { new: true }).select('-passwordHash');
  if (!partner) {
    throw new NotFoundError('Partner');
  }

  // Recompute metaverse visibility after profile change
  await recomputeVisibility(partnerId);

  return { partner };
}

async function changePassword(partnerId, { currentPassword, newPassword }) {
  const partner = await Partner.findById(partnerId);
  if (!partner) {
    throw new NotFoundError('Partner');
  }

  const valid = await bcrypt.compare(currentPassword, partner.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  partner.passwordHash = await bcrypt.hash(newPassword, 12);
  await partner.save();

  return { message: 'Password updated successfully' };
}

function signToken(partner) {
  return jwt.sign(
    { id: partner._id, email: partner.email, companyName: partner.companyName, role: partner.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function formatPartner(partner) {
  return {
    id: partner._id,
    email: partner.email,
    companyName: partner.companyName,
    role: partner.role,
    profilePic: partner.profilePic ? (partner.profilePic.url || partner.profilePic) : null,
    address: partner.address,
    country: partner.country,
    city: partner.city,
    phone: partner.phone,
    zipCode: partner.zipCode,
    createdAt: partner.createdAt,
  };
}

module.exports = { register, login, getProfile, updateProfile, changePassword };
