const Showroom = require('../models/Showroom');
const { NotFoundError, ValidationError } = require('../utils/errors');

const HEX_COLOR_RE = /^[0-9a-fA-F]{6}$/;

function validateColor(value, field) {
  if (value !== undefined && !HEX_COLOR_RE.test(value)) {
    throw new ValidationError(`${field} must be a 6-digit hex color (e.g. "ff0000")`);
  }
}

async function getShowroom(partnerId) {
  const showroom = await Showroom.findOne({ partner: partnerId });
  if (!showroom) throw new NotFoundError('Showroom');
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
      }
    });
  }

  if (video_panels !== undefined) {
    if (video_panels.base_color !== undefined) update['video_panels.base_color'] = video_panels.base_color;
    if (video_panels.scale      !== undefined) update['video_panels.scale']      = video_panels.scale;
    ['panel_01', 'panel_02'].forEach((k) => {
      if (video_panels[k] !== undefined) {
        update[`video_panels.${k}.enabled`] = video_panels[k].enabled ?? true;
      }
    });
  }

  if (model_3d !== undefined) {
    update['model_3d.enabled'] = model_3d.enabled ?? true;
    update['model_3d.scale']   = model_3d.scale   ?? 1;
  }

  const showroom = await Showroom.findOneAndUpdate(
    { partner: partnerId },
    { $set: update },
    { new: true, upsert: true }
  );

  return { showroom };
}

module.exports = { getShowroom, saveShowroom };
