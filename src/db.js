const mongoose = require('mongoose');
const config = require('./config');

async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
