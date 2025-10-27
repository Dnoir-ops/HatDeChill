🧠 Mục đích

Đây là dự án web đọc sách trực tuyến được xây dựng bằng Node.js + Express + MongoDB.
Mục tiêu của ChatGPT là hỗ trợ phát triển, mở rộng, sửa lỗi và viết tài liệu cho dự án này.

⚙️ Công nghệ chính

Backend: Node.js + Express.js

Database: MongoDB (Mongoose ORM)

Authentication: JWT hoặc Passport.js

Frontend: React

Upload File: Multer (hoặc tương tự)

Download File: Route có quyền hạn (middleware xác thực)

📚 Chức năng chính
1. Đăng ký, Đăng nhập, Đăng xuất

Người dùng có thể đăng ký tài khoản (tên, email, mật khẩu được mã hóa bằng bcrypt).

Đăng nhập nhận về JWT token.

Đăng xuất bằng cách xóa token khỏi client.

Middleware authMiddleware để bảo vệ các route yêu cầu đăng nhập.

2. Tìm kiếm sách

API /books/search hỗ trợ tìm theo:

Tên sách (title)

Tác giả (author)

Thể loại (category)

Có thể dùng query params:
GET /books/search?title=abc&author=xyz&category=romance

3. Lưu vào mục yêu thích

Người dùng có thể lưu sách vào danh sách yêu thích.

API mẫu:

POST /favorites/:bookId (thêm)

DELETE /favorites/:bookId (xóa)

GET /favorites (xem danh sách yêu thích)

4. Bình luận & Đánh giá

Người dùng có thể bình luận và đánh giá (1–5 sao) sách.

Mỗi bình luận gồm: nội dung, điểm, ngày tạo, người viết.

API mẫu:

POST /books/:bookId/comments

GET /books/:bookId/comments

5. Upload sách

Admin hoặc người dùng có quyền có thể upload file sách (PDF, EPUB, TXT).

Sử dụng Multer để upload file.

Lưu đường dẫn file trong MongoDB.

API mẫu:

POST /books/upload (có middleware xác thực quyền)

6. Download sách

Người dùng đã đăng nhập có thể tải sách đã được upload.

API mẫu:

GET /books/:bookId/download

🧩 Cấu trúc thư mục gợi ý
project/
├── src/
│   ├── app.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── books.js
│   │   ├── comments.js
│   │   └── favorites.js
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── utils/
├── uploads/ (chứa file sách)
├── package.json
└── chatgpt-instructions.md  ← file này

🧭 Khi ChatGPT làm việc với project này:

Luôn viết code theo cấu trúc trên.

Sử dụng async/await, try/catch, và mongoose.

Giải thích ngắn gọn ý tưởng trước khi viết code.

Nếu cần thêm route hoặc tính năng mới, luôn cập nhật tài liệu API.

Không xóa code gốc — chỉ mở rộng hoặc ghi chú thay đổi.

Luôn bảo đảm tính bảo mật (mã hóa mật khẩu, kiểm tra quyền truy cập).

🔐 Môi trường (.env)
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/books
JWT_SECRET=your_jwt_secret
UPLOAD_DIR=uploads