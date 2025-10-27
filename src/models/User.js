const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, // Tự động lowercase email để tránh duplicate
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ'] // Validation regex
  },
  password: { type: String, required: true, minlength: 6 }, // Thêm minlength cho bảo mật
  role: { type: String, enum: ['author', 'admin'], default: 'reader' }, // Bỏ 'guest' nếu không dùng
  bio: { type: String, maxlength: 500 },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  lastLogin: { // Thêm trường mới để theo dõi thời gian đăng nhập gần nhất
    type: Date,
    default: null,
  }
}, { 
  timestamps: true // Tự động createdAt/updatedAt
});

// ✅ Hook: Hash password trước khi save (với error handling)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10); // Explicit genSalt (tùy chọn, bcrypt.hash tự gen nếu không pass)
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err); // Catch error để không crash server
  }
});

// ✅ Method: So sánh password (async để an toàn với await trong controller)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ Index cho email (tăng tốc query)
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);