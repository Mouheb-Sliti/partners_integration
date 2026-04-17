const express = require('express');
const unityController = require('../controllers/unity.controller');

const router = express.Router();

// GET /unity/partners — list all active partners (public)
router.get('/partners', unityController.listPartners);

// GET /unity/partners/:id/showroom — get filtered showroom by subscription (public)
router.get('/partners/:id/showroom', unityController.getPartnerShowroom);
// GET /unity/partners/:id/content – full partner content for Unity (profile + media + showroom)
router.get('/partners/:id/content', unityController.getPartnerContent);
module.exports = router;
