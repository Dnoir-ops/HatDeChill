
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes cho web forms (GET/POST)
router.get('/login', (req, res) => res.render('users/login'));
router.post('/login', authController.login);
router.get('/register', (req, res) => res.render('users/register'));
router.post('/register', authController.register);
router.post('/logout', authController.logout);

// API routes (nếu cần tách)
router.post('/api/register', authController.register);
router.post('/api/login', authController.login);
router.post('/api/logout', authController.logout);

module.exports = router;