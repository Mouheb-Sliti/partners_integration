require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const Offer = require('../models/Offer');

const offers = [
  {
    name: 'media',
    displayName: 'Media Offer',
    description: 'Limited content exposure – up to 2 images only.',
    maxImages: 2,
    maxVideos: 0,
    max3dObjects: 0,
    isActive: true,
  },
  {
    name: 'full',
    displayName: 'Full Offer',
    description: 'Full access – up to 4 images, 2 videos, and 1 3D object.',
    maxImages: 4,
    maxVideos: 2,
    max3dObjects: 1,
    isActive: true,
  },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  for (const offer of offers) {
    const exists = await Offer.findOne({ name: offer.name });
    if (!exists) {
      await Offer.create(offer);
      console.log(`Created offer: ${offer.displayName}`);
    } else {
      console.log(`Offer already exists: ${offer.displayName}`);
    }
  }

  console.log('Seed complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
