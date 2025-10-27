
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
	currentPage: { type: Number, required: true },
	totalPages: { type: Number },
	updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Progress', progressSchema);
