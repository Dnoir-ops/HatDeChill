const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createUser(name, email, password, role = 'user') {
  await mongoose.connect(
    `mongodb+srv://${encodeURIComponent(process.env.MONGO_USER)}:${encodeURIComponent(process.env.MONGO_PASS)}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}?${process.env.MONGO_OPTIONS}`
  );
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('User đã tồn tại:', email);
    await mongoose.disconnect();
    return;
  }
  const user = new User({ name, email, password, role });
  await user.save();
  console.log('Tạo user thành công:', user);
  await mongoose.disconnect();
}

// Thay đổi thông tin user tại đây
createUser('Test User', 'test@example.com', '123456');
