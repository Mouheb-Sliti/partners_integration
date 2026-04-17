const mongoose = require('mongoose');

const surfaceSchema = {
  texture_id: { type: Number, default: 0 },
  base_color: { type: String, default: 'ffffff' },
};

const showroomSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },

    // ── Showroom design (matches Unity skeleton) ──
    showroom_design: {
      showroom_model_id: { type: Number, default: 1 },
      ceiling: surfaceSchema,
      walls: surfaceSchema,
      floor: surfaceSchema,
      light: {
        color: { type: String, default: 'ffffff' },
        intensity: { type: Number, default: 15 },
      },
    },

    // ── Image panels (up to 4) ──
    image_panels: {
      base_color: { type: String, default: '000000' },
      scale: { type: Number, default: 1.2 },
      panel_01: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
      panel_02: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
      panel_03: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
      panel_04: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
    },

    // ── Video panels (up to 2) ──
    video_panels: {
      base_color: { type: String, default: '000000' },
      scale: { type: Number, default: 1 },
      panel_01: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
      panel_02: { enabled: { type: Boolean, default: false }, media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' } },
    },

    // ── 3D model (single) ──
    model_3d: {
      enabled: { type: Boolean, default: false },
      scale: { type: Number, default: 1 },
      media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Showroom', showroomSchema);
