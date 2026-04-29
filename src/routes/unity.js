const express = require('express');
const unityController = require('../controllers/unity.controller');

const router = express.Router();

// GET /unity/world — full world data: all visible partners + showroom + media + subscription (public, no auth)
router.get('/world', unityController.getWorld);

// GET /unity/partners — list all partners with a valid subscription (public, no auth)
router.get('/partners', unityController.listPartners);

// GET /unity/partners/:identifier/showroom — get showroom settings by id or companyName (public, no auth)
router.get('/partners/:identifier/showroom', unityController.getShowroom);

// PUT /unity/partners/:identifier/showroom — save showroom settings by id or companyName (public, no auth)
router.put('/partners/:identifier/showroom', unityController.saveShowroom);

// GET /unity/partners/:identifier/media — get partner media by id or companyName (public, no auth)
router.get('/partners/:identifier/media', unityController.getPartnerMedia);

module.exports = router;
