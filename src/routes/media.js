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

// Valid upload slots
const VALID_SLOTS = ['image1', 'image2', 'image3', 'image4', 'video1', 'video2', '3dmodel', 'profile_image'];
const UPLOAD_FIELDS = VALID_SLOTS.map((name) => ({ name, maxCount: 1 }));

// Allowed extensions per slot type
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
const OBJECT_EXTS = ['.glb', '.gltf', '.obj', '.fbx'];

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
    const ext = path.extname(file.originalname).toLowerCase();
    const field = file.fieldname;

    // Per-slot type validation
    if ((field.startsWith('image') || field === 'profile_image') && IMAGE_EXTS.includes(ext)) return cb(null, true);
    if (field.startsWith('video') && VIDEO_EXTS.includes(ext)) return cb(null, true);
    if (field === '3dmodel' && OBJECT_EXTS.includes(ext)) return cb(null, true);

    cb(new Error(`File type ${ext} is not allowed for field ${field}`));
  },
});

// GET /media — list partner's uploaded media
router.get('/', authenticate, mediaController.listMedia);

// POST /media — upload a single file to a named slot (image1..4, video1..2, 3dmodel, profile_image)
router.post('/', authenticate, upload.fields(UPLOAD_FIELDS), mediaController.uploadMedia);

// DELETE /media/:id — delete a media file
router.delete('/:id', authenticate, mediaController.deleteMedia);

module.exports = router;
