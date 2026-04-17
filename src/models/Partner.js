const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    companyName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['partner'], default: 'partner' },
    isActive: { type: Boolean, default: true },
    isVisibleInMetaverse: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);
