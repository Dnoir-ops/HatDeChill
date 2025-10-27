// routes/comments.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/books/:bookId/comments', authMiddleware, (req, res, next) => {
  commentController.addComment(req, res).catch(next);
});

router.get('/books/:bookId/comments', (req, res, next) => {
  commentController.getComments(req, res).catch(next);
});

router.delete('/books/:bookId/comments/:commentId', authMiddleware, (req, res, next) => {
  commentController.deleteComment(req, res).catch(next);
});

module.exports = router;