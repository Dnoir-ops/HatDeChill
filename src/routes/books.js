const express = require('express');
const router = express.Router();
const sessionAuth = require('../middleware/sessionAuth');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const bookController = require('../controllers/bookController');
const adminController = require('../controllers/adminController');
const commentController = require('../controllers/commentController');

console.log(bookController);


// ⚠️ Đặt route cụ thể TRƯỚC route động /:id
// =============================


const categories = [
  "Romance",
  "Mystery/Detective",
  "Fantasy/Science Fiction",
  "Thrillers/Horror",
  "Self-help/Inspirational",
  "Biography, Autobiography & Memoir",
  "Business & Finance",
  "Children's & Young Adult - YA",
  "Science, Education & History",
  "Classics",
  'Handwritten Books'
];



// 📦 Kho lưu trữ của user (sách đã viết)
router.get('/archive', sessionAuth, bookController.getMyBooks);

// ✍️ Viết sách mới
router.get('/write', sessionAuth, roleMiddleware(['author', 'admin']), (req, res) => {
  res.render('books/write', { categories });
});

router.post(
  '/write',
  sessionAuth,
  roleMiddleware(['author', 'admin']),
  bookController.writeBook
);

// 📥 Upload sách mới (route GET render form với pass categories - chỉ 1 route, xóa duplicate)
router.get('/upload', sessionAuth, roleMiddleware(['author', 'admin']), (req, res) => {
  console.log('Categories passed to upload:', categories);  // Test console để check array
  res.render('books/upload', { categories });  // ✅ Pass categories để EJS dùng
});

router.post(
  '/upload',
  sessionAuth,
  roleMiddleware(['author', 'admin']),
  bookController.uploadBook
);

// ✏️ Chỉnh sửa sách
router.get(
  '/edit/:id',
  sessionAuth,
  roleMiddleware(['author', 'admin']),
  bookController.editBook
);
router.post(
  '/edit/:id',
  sessionAuth,
  roleMiddleware(['author', 'admin']),
  bookController.updateBook
);

// XÓA BÌNH LUẬN (phải đặt TRƯỚC /:id(*))
router.delete(
  '/:bookId/comments/:commentId',
  authMiddleware,
  roleMiddleware(['admin']), // Chỉ admin
  commentController.deleteComment
);

// XÓA SÁCH (đặt SAU)
router.delete(
  '/:id(*)',
  sessionAuth,
  roleMiddleware(['author', 'admin']),
  bookController.deleteBook
);

// 📥 Tải xuống file sách (cũ, nếu có)
router.get(
  '/download/:id',
  authMiddleware,
  bookController.downloadBook
);

// 🔍 Tìm kiếm sách công khai
router.get('/search', bookController.searchBooks);

// 📚 Danh sách sách công khai
router.get('/', bookController.getBooks);

// 📥 Tải xuống file sách
router.get('/:id/download', authMiddleware, bookController.downloadBook);

// 📖 Chi tiết sách 
router.get('/:id', bookController.getBookById);

// 🔍 Tìm sách từ API 
router.get('/api-search', bookController.getBooksFromAPI);
// 📖 Chi tiết sách từ API
router.get('/api-detail/:id(*)', bookController.getBookByIdFromAPI);
module.exports = router;