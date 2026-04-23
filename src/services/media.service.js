const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const Partner = require('../models/Partner');
const Showroom = require('../models/Showroom');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { recomputeVisibility } = require('./metaverse.service');

// Maps each slot name to its media type
const SLOT_TYPE_MAP = {
  image1: 'image', image2: 'image', image3: 'image', image4: 'image',
  video1: 'video', video2: 'video',
  '3d_image': '3d_object',
  profile_image: 'image',
};

// Maps media slots to their corresponding showroom panel paths
const SLOT_TO_SHOWROOM = {
  image1: 'image_panels.panel_01',
  image2: 'image_panels.panel_02',
  image3: 'image_panels.panel_03',
  image4: 'image_panels.panel_04',
  video1: 'video_panels.panel_01',
  video2: 'video_panels.panel_02',
  '3d_image': 'model_3d',
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
 * @param {string} slot - slot name (image1..4, video1..2, 3d_image, profile_image)
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

  // Auto-link to showroom panel
  const showroomPath = SLOT_TO_SHOWROOM[slot];
  if (showroomPath) {
    await Showroom.findOneAndUpdate(
      { partner: partnerId },
      { [`${showroomPath}.media`]: media._id, [`${showroomPath}.enabled`]: true }
    );
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

  // Clear showroom panel
  const showroomPath = SLOT_TO_SHOWROOM[media.slot];
  if (showroomPath) {
    await Showroom.findOneAndUpdate(
      { partner: partnerId },
      { [`${showroomPath}.media`]: null, [`${showroomPath}.enabled`]: false }
    );
  }

  await media.deleteOne();
  await recomputeVisibility(partnerId);

  return { message: 'Media deleted' };
}

function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}

module.exports = { listMedia, uploadMedia, deleteMedia };
