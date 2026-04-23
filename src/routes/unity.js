const express = require('express');
const unityController = require('../controllers/unity.controller');

const router = express.Router();

// GET /unity/partners — list all active partners (public, for Unity lobby)
router.get('/partners', unityController.listPartners);

// GET /unity/partners/:id/content — full partner content for Unity rendering (public)
router.get('/partners/:id/content', unityController.getPartnerContent);

module.exports = router;
