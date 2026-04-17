const express = require('express');
const metaverseController = require('../controllers/metaverse.controller');

const router = express.Router();

// GET /metaverse/partners — list all eligible partners visible in the metaverse
router.get('/partners', metaverseController.getEligiblePartners);

module.exports = router;
