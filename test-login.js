const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./src/models/User');

async function testLogin(email, password) {
  await mongoose.connect(
    `mongodb+srv://${encodeURIComponent(process.env.MONGO_USER)}:${encodeURIComponent(process.env.MONGO_PASS)}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}?${process.env.MONGO_OPTIONS}`
  );
  const user = await User.findOne({ email });
  if (!user) {
    console.log('Không tìm thấy user');
    return;
  }
  const isMatch = await user.comparePassword(password);
  if (isMatch) {
    console.log('Đăng nhập thành công:', user);
  } else {
    console.log('Sai mật khẩu');
  }
  await mongoose.disconnect();
}

// Thay đổi email và password để test
const email = 'test@example.com';
const password = '123456';
testLogin(email, password);
