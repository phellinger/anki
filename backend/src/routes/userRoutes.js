const express = require('express');
const router = express.Router();
const { findOrCreateUser } = require('../src/controllers/userController');

router.post('/identify', findOrCreateUser);

module.exports = router;
