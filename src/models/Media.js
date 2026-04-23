const mongoose = require('mongoose');

const VALID_SLOTS = ['image1', 'image2', 'image3', 'image4', 'video1', 'video2', '3dmodel', 'profile_image'];

const mediaSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    type: { type: String, enum: ['image', 'video', '3dmodel'], required: true },
    slot: { type: String, enum: VALID_SLOTS, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filename: { type: String, required: true },   // stored filename on disk
    url: { type: String, required: true },         // public-accessible path
  },
  { timestamps: true }
);

mediaSchema.index({ partner: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Media', mediaSchema);
