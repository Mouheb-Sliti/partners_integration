const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
