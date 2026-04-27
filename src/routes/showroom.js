const express = require('express');
const authenticate = require('../middleware/auth');
const showroomController = require('../controllers/showroom.controller');

const router = express.Router();

// GET /showroom — get partner's showroom config
router.get('/', authenticate, showroomController.getShowroom);

// PUT /showroom — save the full showroom config (design + panels + 3d model)
router.put('/', authenticate, showroomController.saveShowroom);

module.exports = router;
