const express = require('express');
const authenticate = require('../middleware/auth');
const showroomController = require('../controllers/showroom.controller');

const router = express.Router();

// GET /showroom — get partner's showroom config
router.get('/', authenticate, showroomController.getShowroom);

// PUT /showroom — update showroom layout config
router.put('/', authenticate, showroomController.updateLayout);

// PUT /showroom/slots — assign media to showroom slots
router.put('/slots', authenticate, showroomController.updateSlots);

module.exports = router;
