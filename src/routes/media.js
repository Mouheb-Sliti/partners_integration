const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const config = require('../config');
const mediaController = require('../controllers/media.controller');

const router = express.Router();

// Ensure upload directory exists
fs.mkdirSync(config.upload.dir, { recursive: true });

// Multer config — store on local disk
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.upload.dir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = {
      image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      video: ['.mp4', '.webm', '.mov'],
      '3d_object': ['.glb', '.gltf', '.obj', '.fbx'],
    };
    const ext = path.extname(file.originalname).toLowerCase();
    const allExts = [...allowed.image, ...allowed.video, ...allowed['3d_object']];
    if (allExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed`));
    }
  },
});

// GET /media — list partner's uploaded media
router.get('/', authenticate, mediaController.listMedia);

// POST /media — batch upload media files (replaces per type by default)
router.post('/', authenticate, upload.array('files', 10), mediaController.uploadMedia);

// DELETE /media/:id — delete a media file
router.delete('/:id', authenticate, mediaController.deleteMedia);

module.exports = router;
