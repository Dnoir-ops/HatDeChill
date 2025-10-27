const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Tạo thư mục uploads ở project root nếu chưa tồn tại
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Absolute để lưu
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + '-' + file.fieldname + ext;
    cb(null, filename); // Chỉ filename, relative sẽ build sau
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.epub', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Chỉ cho phép file PDF, EPUB, TXT'));
};

module.exports = multer({ storage, fileFilter });