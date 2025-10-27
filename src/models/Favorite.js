const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: String, required: true }, // Thay ObjectId bằng String để hỗ trợ 'works/OL...'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Favorite', favoriteSchema);