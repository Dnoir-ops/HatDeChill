const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
  },
  category: [{
    type: String,
    default: ['General'],
  }],
  description: {
    type: String,
    default: '',
  },
  content: {
    type: String,  // Nội dung text (từ write hoặc parse PDF)
  },
  fileUrl: {
    type: String,  // Đường dẫn file upload
  },
  coverImage: {
    type: String,
  },
  previewUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],  // ✅ Thêm 'pending' và 'rejected'
    default: 'draft',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Các field khác nếu có (e.g., cover_i cho API books)
}, {
  timestamps: true,
});

module.exports = mongoose.model('Book', bookSchema);