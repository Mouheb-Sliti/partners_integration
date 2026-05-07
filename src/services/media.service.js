const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const Partner = require('../models/Partner');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { recomputeVisibility } = require('./metaverse.service');

// Maps each slot name to its media type
const SLOT_TYPE_MAP = {
  image1: 'image', image2: 'image', image3: 'image', image4: 'image',
  video1: 'video', video2: 'video',
  '3dmodel': '3dmodel',
  profile_image: 'image',
};

async function listMedia(partnerId) {
  const media = await Media.find({ partner: partnerId }).sort({ slot: 1 });
  const partner = await Partner.findById(partnerId).select('profilePic').populate('profilePic');

  const bySlot = {};
  for (const m of media) {
    if (m.slot !== 'profile_image') {
      bySlot[m.slot] = m;
    }
  }

  return {
    total: media.filter((m) => m.slot !== 'profile_image').length,
    profile_image: partner.profilePic
      ? { url: partner.profilePic.url, originalName: partner.profilePic.originalName }
      : null,
    media: bySlot,
  };
}

/**
 * Upload a single file to a named slot. Replaces existing file in that slot.
 * @param {string} partnerId
 * @param {Object} file - multer file object
 * @param {string} slot - slot name (image1..4, video1..2, 3dmodel, profile_image)
 * @param {string} uploadDir - path to upload directory
 */
async function uploadMedia(partnerId, file, slot, uploadDir) {
  const type = SLOT_TYPE_MAP[slot];
  if (!type) {
    cleanupFile(file.path);
    throw new ValidationError(`Invalid slot: ${slot}`);
  }

  // Replace existing file in this slot
  const existing = await Media.findOne({ partner: partnerId, slot });
  if (existing) {
    cleanupFile(path.join(uploadDir, existing.filename));
    await existing.deleteOne();
  }

  // Create new media document
  const media = await Media.create({
    partner: partnerId,
    type,
    slot,
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    filename: file.filename,
    url: `/uploads/${file.filename}`,
  });

  // Handle profile_image → update Partner.profilePic ref
  if (slot === 'profile_image') {
    await Partner.findByIdAndUpdate(partnerId, { profilePic: media._id });
  }

  await recomputeVisibility(partnerId);

  return { slot, media };
}

async function deleteMedia(partnerId, mediaId, uploadDir) {
  const media = await Media.findOne({ _id: mediaId, partner: partnerId });
  if (!media) {
    throw new NotFoundError('Media');
  }

  // Remove file from disk
  cleanupFile(path.join(uploadDir, media.filename));

  // If profile_image, clear partner ref
  if (media.slot === 'profile_image') {
    await Partner.findByIdAndUpdate(partnerId, { profilePic: null });
  }

  await media.deleteOne();
  await recomputeVisibility(partnerId);

  return { message: 'Media deleted' };
}

async function update3dModelMetadata(partnerId, payload) {
  const media = await Media.findOne({ partner: partnerId, slot: '3dmodel' });
  if (!media) {
    throw new NotFoundError('3D model media');
  }

  const productName = typeof payload.productName === 'string' ? payload.productName.trim() : '';
  const descriptionInput = payload.description ?? payload.descirption;
  const description = typeof descriptionInput === 'string' ? descriptionInput.trim() : '';
  const price = Number(payload.price);

  if (!productName) {
    throw new ValidationError('productName is required');
  }
  if (!description) {
    throw new ValidationError('description is required');
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new ValidationError('price must be a non-negative number');
  }

  media.productName = productName;
  media.description = description;
  media.price = price;
  await media.save();

  return {
    slot: media.slot,
    media: {
      _id: media._id,
      url: media.url,
      type: media.type,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      productName: media.productName,
      price: media.price,
      description: media.description,
      descirption: media.description,
    },
  };
}

function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}

module.exports = { listMedia, uploadMedia, deleteMedia, update3dModelMetadata };
