const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    type: { type: String, enum: ['image', 'video', '3d_object'], required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filename: { type: String, required: true },   // stored filename on disk
    url: { type: String, required: true },         // public-accessible path
  },
  { timestamps: true }
);

mediaSchema.index({ partner: 1, type: 1 });

module.exports = mongoose.model('Media', mediaSchema);
