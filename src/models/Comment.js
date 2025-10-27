const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    book: {
        type: String,
        required: true,
        index: true // Thêm index để tăng tốc truy vấn
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('Comment', commentSchema);