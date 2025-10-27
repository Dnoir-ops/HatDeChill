const express = require('express');
const router = express.Router();

// Import controller và middleware
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middleware/authMiddleware');

// Log để debug import
console.log('✅ favoriteRoutes loaded');

// ✅ GET /favorites - Xem danh sách yêu thích
router.get('/', authMiddleware, favoriteController.getFavorites);

// ✅ POST /favorites/:bookId - Thêm vào yêu thích
router.post('/:bookId', authMiddleware, favoriteController.addFavorite);

// ✅ DELETE /favorites/:bookId - Xóa khỏi yêu thích
router.delete('/:bookId', authMiddleware, favoriteController.removeFavorite);

module.exports = router;