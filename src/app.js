const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

const authRoutes = require('./routes/auth');
const showroomRoutes = require('./routes/showroom');
const mediaRoutes = require('./routes/media');
const offerRoutes = require('./routes/offers');
const unityRoutes = require('./routes/unity');
const metaverseRoutes = require('./routes/metaverse');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(config.upload.dir));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'partners-integration' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/showroom', showroomRoutes);
app.use('/media', mediaRoutes);
app.use('/offers', offerRoutes);
app.use('/unity', unityRoutes);
app.use('/metaverse', metaverseRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
