const Showroom = require('../models/Showroom');
const Media = require('../models/Media');
const { NotFoundError, ValidationError } = require('../utils/errors');

// ── helpers ────────────────────────────────────────────────────────────────────

function populateShowroom(query) {
  return query
    .populate('image_panels.panel_01.media')
    .populate('image_panels.panel_02.media')
    .populate('image_panels.panel_03.media')
    .populate('image_panels.panel_04.media')
    .populate('video_panels.panel_01.media')
    .populate('video_panels.panel_02.media')
    .populate('model_3d.media');
}

const HEX_COLOR_RE = /^[0-9a-fA-F]{6}$/;

function validateColor(value, field) {
  if (value !== undefined && !HEX_COLOR_RE.test(value)) {
    throw new ValidationError(`${field} must be a 6-digit hex color (e.g. "ff0000")`);
  }
}

/**
 * Normalises a media value coming from the frontend — either a populated
 * object (with ._id), a plain ObjectId string, or null/undefined to clear.
 */
function extractMediaId(val) {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  return val.toString();
}

// ── service functions ──────────────────────────────────────────────────────────

async function getShowroom(partnerId) {
  const showroom = await populateShowroom(Showroom.findOne({ partner: partnerId }));
  if (!showroom) {
    throw new NotFoundError('Showroom');
  }
  return { showroom };
}

async function saveShowroom(partnerId, showroomData) {
  if (!showroomData || typeof showroomData !== 'object') {
    throw new ValidationError('showroom must be a JSON object');
  }

  const { showroom_design, image_panels, video_panels, model_3d } = showroomData;

  // Validate hex colors when provided
  if (showroom_design) {
    if (showroom_design.ceiling) validateColor(showroom_design.ceiling.base_color, 'ceiling.base_color');
    if (showroom_design.walls)   validateColor(showroom_design.walls.base_color,   'walls.base_color');
    if (showroom_design.floor)   validateColor(showroom_design.floor.base_color,   'floor.base_color');
    if (showroom_design.light)   validateColor(showroom_design.light.color,        'light.color');
  }
  if (image_panels?.base_color !== undefined) validateColor(image_panels.base_color, 'image_panels.base_color');
  if (video_panels?.base_color !== undefined) validateColor(video_panels.base_color, 'video_panels.base_color');

  // Collect all media IDs to validate ownership
  const mediaIds = [];
  const collectMedia = (panel) => {
    const id = extractMediaId(panel?.media);
    if (id) mediaIds.push(id);
  };

  if (image_panels) {
    ['panel_01', 'panel_02', 'panel_03', 'panel_04'].forEach((k) => collectMedia(image_panels[k]));
  }
  if (video_panels) {
    ['panel_01', 'panel_02'].forEach((k) => collectMedia(video_panels[k]));
  }
  if (model_3d) collectMedia(model_3d);

  if (mediaIds.length > 0) {
    const ownedMedia = await Media.find({ _id: { $in: mediaIds }, partner: partnerId }).select('_id');
    const ownedIds = new Set(ownedMedia.map((m) => m._id.toString()));
    const invalid = mediaIds.filter((id) => !ownedIds.has(id));
    if (invalid.length > 0) {
      throw new ValidationError(`Invalid media IDs: ${invalid.join(', ')}`);
    }
  }

  // Build $set — only touch keys that were explicitly sent
  const update = {};

  if (showroom_design !== undefined) {
    update.showroom_design = showroom_design;
  }

  if (image_panels !== undefined) {
    if (image_panels.base_color !== undefined) update['image_panels.base_color'] = image_panels.base_color;
    if (image_panels.scale      !== undefined) update['image_panels.scale']      = image_panels.scale;
    ['panel_01', 'panel_02', 'panel_03', 'panel_04'].forEach((k) => {
      if (image_panels[k] !== undefined) {
        update[`image_panels.${k}.enabled`] = image_panels[k].enabled ?? true;
        update[`image_panels.${k}.media`]   = extractMediaId(image_panels[k].media);
      }
    });
  }

  if (video_panels !== undefined) {
    if (video_panels.base_color !== undefined) update['video_panels.base_color'] = video_panels.base_color;
    if (video_panels.scale      !== undefined) update['video_panels.scale']      = video_panels.scale;
    ['panel_01', 'panel_02'].forEach((k) => {
      if (video_panels[k] !== undefined) {
        update[`video_panels.${k}.enabled`] = video_panels[k].enabled ?? true;
        update[`video_panels.${k}.media`]   = extractMediaId(video_panels[k].media);
      }
    });
  }

  if (model_3d !== undefined) {
    update['model_3d.enabled'] = model_3d.enabled ?? true;
    update['model_3d.scale']   = model_3d.scale   ?? 1;
    update['model_3d.media']   = extractMediaId(model_3d.media);
  }

  const showroom = await populateShowroom(
    Showroom.findOneAndUpdate(
      { partner: partnerId },
      { $set: update },
      { new: true, upsert: true }
    )
  );

  return { showroom };
}

module.exports = { getShowroom, saveShowroom };
