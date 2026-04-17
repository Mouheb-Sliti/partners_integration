const Showroom = require('../models/Showroom');
const Media = require('../models/Media');
const { NotFoundError, ValidationError } = require('../utils/errors');

async function getShowroom(partnerId) {
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
  return { showroom };
}

async function updateLayout(partnerId, designConfig) {
  if (!designConfig || typeof designConfig !== 'object') {
    throw new ValidationError('showroom_design must be a JSON object');
  }

  const showroom = await Showroom.findOneAndUpdate(
    { partner: partnerId },
    { showroom_design: designConfig },
    { new: true }
  );

  if (!showroom) {
    throw new NotFoundError('Showroom');
  }
  return { showroom };
}

async function updateSlots(partnerId, { image_panels, video_panels, model_3d }) {
  const showroom = await Showroom.findOne({ partner: partnerId });
  if (!showroom) {
    throw new NotFoundError('Showroom');
  }

  // Collect all media IDs to validate ownership
  const mediaIds = [];
  const collectId = (panel) => { if (panel?.media_id) mediaIds.push(panel.media_id); };

  if (image_panels) {
    ['panel_01', 'panel_02', 'panel_03', 'panel_04'].forEach((k) => collectId(image_panels[k]));
  }
  if (video_panels) {
    ['panel_01', 'panel_02'].forEach((k) => collectId(video_panels[k]));
  }
  if (model_3d) collectId(model_3d);

  if (mediaIds.length > 0) {
    const ownedMedia = await Media.find({ _id: { $in: mediaIds }, partner: partnerId }).select('_id');
    const ownedIds = new Set(ownedMedia.map((m) => m._id.toString()));
    const invalid = mediaIds.filter((id) => !ownedIds.has(id));
    if (invalid.length > 0) {
      throw new ValidationError(`Invalid media IDs: ${invalid.join(', ')}`);
    }
  }

  // Apply updates
  const mapPanel = (panel) => ({
    enabled: panel?.enabled || false,
    media: panel?.media_id || undefined,
  });

  if (image_panels) {
    if (image_panels.base_color) showroom.image_panels.base_color = image_panels.base_color;
    if (image_panels.scale != null) showroom.image_panels.scale = image_panels.scale;
    ['panel_01', 'panel_02', 'panel_03', 'panel_04'].forEach((k) => {
      if (image_panels[k]) showroom.image_panels[k] = mapPanel(image_panels[k]);
    });
  }

  if (video_panels) {
    if (video_panels.base_color) showroom.video_panels.base_color = video_panels.base_color;
    if (video_panels.scale != null) showroom.video_panels.scale = video_panels.scale;
    ['panel_01', 'panel_02'].forEach((k) => {
      if (video_panels[k]) showroom.video_panels[k] = mapPanel(video_panels[k]);
    });
  }

  if (model_3d) {
    showroom.model_3d = {
      enabled: model_3d.enabled || false,
      scale: model_3d.scale || 1,
      media: model_3d.media_id || undefined,
    };
  }

  await showroom.save();

  const updated = await Showroom.findById(showroom._id)
    .populate('image_panels.panel_01.media')
    .populate('image_panels.panel_02.media')
    .populate('image_panels.panel_03.media')
    .populate('image_panels.panel_04.media')
    .populate('video_panels.panel_01.media')
    .populate('video_panels.panel_02.media')
    .populate('model_3d.media');
  return { message: 'Showroom updated', showroom: updated };
}

module.exports = { getShowroom, updateLayout, updateSlots };
