const express = require('express');
const authenticate = require('../middleware/auth');
const offerController = require('../controllers/offer.controller');

const router = express.Router();

// GET /offers — list all available offers
router.get('/', offerController.listOffers);

// POST /offers/subscribe — subscribe the partner to an offer
router.post('/subscribe', authenticate, offerController.subscribe);

// GET /offers/my-subscription — get current partner subscription
router.get('/my-subscription', authenticate, offerController.getMySubscription);

module.exports = router;
