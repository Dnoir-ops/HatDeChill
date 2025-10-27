const Comment = require('../models/Comment');
const Book = require('../models/Book');

// Thêm bình luận
exports.addComment = async (req, res) => {
    try {
        console.log('Received body:', req.body); // Debug dữ liệu nhận được
        const { content, rating } = req.body;
        const { bookId } = req.params;
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Vui lòng đăng nhập để bình luận' });
        }
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Nội dung bình luận là bắt buộc' });
        }

        // Decode bookId để lưu đúng
        const decodedBookId = decodeURIComponent(bookId);
        console.log('Decoded bookId for addComment:', decodedBookId); // Debug

        const comment = new Comment({
            book: decodedBookId,
            user: req.user.id,
            content: content.trim(),
            rating: rating ? parseInt(rating) : null
        });
        await comment.save();
        const populatedComment = await Comment.findById(comment._id).populate('user', 'name');
        res.status(201).json({ message: 'Bình luận thành công', comment: populatedComment });
    } catch (err) {
        console.error('Lỗi thêm bình luận:', err.message);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Lấy danh sách bình luận
exports.getComments = async (req, res) => {
    try {
        const { bookId } = req.params;
        // Decode bookId để query đúng
        const decodedBookId = decodeURIComponent(bookId);
        console.log('Decoded bookId for getComments:', decodedBookId); // Debug
        const comments = await Comment.find({ book: decodedBookId })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        console.error('Lỗi lấy bình luận:', err.message);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Xóa bình luận chỉ admin
exports.deleteComment = async (req, res) => {
    try {
        const { bookId, commentId } = req.params;
        console.log('Xóa bình luận:', { bookId, commentId }); // Debug
        // Decode bookId để so sánh đúng
        const decodedBookId = decodeURIComponent(bookId);
        console.log('Decoded bookId for deleteComment:', decodedBookId); // Debug
        const comment = await Comment.findById(commentId).populate('user', 'name');
        if (!comment) {
            console.log('Comment not found for ID:', commentId); // Debug
            return res.status(404).json({ message: 'Không tìm thấy bình luận' });
        }
        if (comment.book.toString() !== decodedBookId) {
            console.log('Book mismatch:', { commentBook: comment.book, decodedBookId }); // Debug
            return res.status(403).json({ message: 'Bình luận không thuộc sách này' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới xóa được bình luận' });
        }

        await Comment.findByIdAndDelete(commentId);
        console.log(`Đã xóa bình luận ${commentId} bởi admin ${req.user.id}`);
            return res.status(200).json({
            success: true,
            message: 'Xóa bình luận thành công'
        });
    } catch (err) {
        console.error('Lỗi xóa bình luận:', err.message);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

module.exports = {
    addComment: exports.addComment,
    getComments: exports.getComments,
    deleteComment: exports.deleteComment
};