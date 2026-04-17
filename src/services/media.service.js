const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const Showroom = require('../models/Showroom');
const Subscription = require('../models/Subscription');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { recomputeVisibility } = require('./metaverse.service');

const DEFAULT_LIMITS = { image: 4, video: 2, '3d_object': 1 };

function getMediaType(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
  if (['.glb', '.gltf', '.obj', '.fbx'].includes(ext)) return '3d_object';
  return null;
}

async function getUploadLimits(partnerId) {
  const subscription = await Subscription.findOne({ partner: partnerId }).populate('offer');
  if (subscription && subscription.offer) {
    return {
      image: subscription.offer.maxImages,
      video: subscription.offer.maxVideos,
      '3d_object': subscription.offer.max3dObjects,
    };
  }
  return DEFAULT_LIMITS;
}

async function listMedia(partnerId) {
  const media = await Media.find({ partner: partnerId }).sort({ createdAt: -1 });

  const grouped = { image: [], video: [], '3d_object': [] };
  for (const m of media) {
    grouped[m.type].push(m);
  }

  return {
    total: media.length,
    counts: {
      image: grouped.image.length,
      video: grouped.video.length,
      '3d_object': grouped['3d_object'].length,
    },
    media: grouped,
  };
}

/**
 * Batch upload media files with replace-per-type strategy.
 * @param {string} partnerId
 * @param {Array} files - multer files array
 * @param {string} uploadDir - path to upload directory
 * @param {string} mode - "replace" (default) or "append"
 */
async function uploadMedia(partnerId, files, uploadDir, mode = 'replace') {
  if (!files || files.length === 0) {
    throw new ValidationError('No files provided');
  }

  // Step 1 — Classify files by type
  const classified = { image: [], video: [], '3d_object': [] };
  const unsupported = [];

  for (const file of files) {
    const type = getMediaType(file.originalname);
    if (!type) {
      unsupported.push(file);
    } else {
      classified[type].push(file);
    }
  }

  // Cleanup unsupported files from disk immediately
  for (const file of unsupported) {
    cleanupFile(file.path);
  }

  if (unsupported.length > 0 && Object.values(classified).every(arr => arr.length === 0)) {
    throw new ValidationError('All uploaded files have unsupported types');
  }

  // Step 2 — Validate against offer limits
  const limits = await getUploadLimits(partnerId);
  const errors = [];

  for (const type of ['image', 'video', '3d_object']) {
    if (classified[type].length === 0) continue;

    if (mode === 'replace') {
      // In replace mode, new batch count must not exceed the limit
      if (classified[type].length > limits[type]) {
        errors.push(`${type}: uploading ${classified[type].length}, max allowed ${limits[type]}`);
      }
    } else {
      // In append mode, existing + new must not exceed the limit
      const existing = await Media.countDocuments({ partner: partnerId, type });
      if (existing + classified[type].length > limits[type]) {
        errors.push(`${type}: existing ${existing} + uploading ${classified[type].length} exceeds max ${limits[type]}`);
      }
    }
  }

  if (errors.length > 0) {
    // Cleanup all uploaded files on validation failure
    for (const type of ['image', 'video', '3d_object']) {
      for (const file of classified[type]) {
        cleanupFile(file.path);
      }
    }
    throw new ValidationError(`Upload limit exceeded: ${errors.join('; ')}`);
  }

  // Step 3 — Replace per type (delete old, save new)
  const typesProcessed = [];
  const savedMedia = [];

  for (const type of ['image', 'video', '3d_object']) {
    if (classified[type].length === 0) continue;

    if (mode === 'replace') {
      // Delete all existing media of this type for the partner
      const oldMedia = await Media.find({ partner: partnerId, type });
      for (const old of oldMedia) {
        const filePath = path.join(uploadDir, old.filename);
        cleanupFile(filePath);
        // Remove from showroom slots
        await Showroom.updateOne(
          { partner: partnerId },
          { $pull: { slots: { media: old._id } } }
        );
      }
      await Media.deleteMany({ partner: partnerId, type });
    }

    // Save new files
    for (const file of classified[type]) {
      const media = await Media.create({
        partner: partnerId,
        type,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filename: file.filename,
        url: `/uploads/${file.filename}`,
      });
      savedMedia.push(media);
    }

    typesProcessed.push(type);
  }

  // Recompute metaverse visibility after upload
  await recomputeVisibility(partnerId);

  return {
    mode,
    typesProcessed,
    uploaded: savedMedia.length,
    rejected: unsupported.length,
    media: savedMedia,
  };
}

async function deleteMedia(partnerId, mediaId, uploadDir) {
  const media = await Media.findOne({ _id: mediaId, partner: partnerId });
  if (!media) {
    throw new NotFoundError('Media');
  }

  // Remove file from disk
  const filePath = path.join(uploadDir, media.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from showroom slots
  await Showroom.updateOne(
    { partner: partnerId },
    { $pull: { slots: { media: media._id } } }
  );

  await media.deleteOne();

  // Recompute metaverse visibility after deletion
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

module.exports = { listMedia, uploadMedia, deleteMedia, getMediaType, getUploadLimits };
