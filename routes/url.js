const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const urlController = require('../controllers/urlController');

const createLimiter = rateLimit({
    windowMs: 15* 60 * 1000,
    max : 100, 
    message: 'Too many requests, Try again'
});

router.post('/shorten', createLimiter, urlController.createShortUrl);
router.get('/shorten/:shortCode', urlController.getUrlDetails);
router.get('/shorten/:shortCode/stats', urlController.getUrlStats);
router.put('/shorten/:shortCode', createLimiter, urlController.updateUrl);
router.delete('/shorten/:shortCode', createLimiter, urlController.deleteUrl);
router.get('/:shortCode', urlController.redirectToOriginalUrl);

module.exports = router;
