const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },       // 'media' | 'full'
    displayName: { type: String, required: true },
    description: { type: String },
    maxImages: { type: Number, required: true, default: 0 },
    maxVideos: { type: Number, required: true, default: 0 },
    max3dObjects: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
