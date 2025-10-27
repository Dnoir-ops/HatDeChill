const Book = require("../models/Book");
const User = require('../models/User');
const path = require('path'); // Thêm import module path
const PDFParse = require('pdf-parse'); // Đảm bảo đã cài đặt pdf-parse
const fs = require('fs');


// =============================
// 📋 Lấy danh sách sách pending cho admin
// =============================

// Trong adminController.js, hàm getPendingBooks
exports.getPendingBooks = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const pendingBooks = await Book.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("uploadedBy", "name email");

    // THÊM DEBUG: Log để kiểm tra
    console.log('🔍 Số sách pending tìm thấy:', pendingBooks.length);
    console.log('📚 Chi tiết query:', { status: "pending", skip, limit });
    console.log('📊 Tổng sách pending:', await Book.countDocuments({ status: "pending" }));

    const total = await Book.countDocuments({ status: "pending" });
    const totalPages = Math.ceil(total / parseInt(limit));

    res.render("admin/pending-books", {
      books: pendingBooks,
      currentPage: parseInt(page),
      totalPages,
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Lỗi getPendingBooks:", err);
    req.flash("error", "Lỗi tải danh sách sách chờ duyệt!");
    res.redirect("/admin");
  }
};
//
exports.getPendingBookDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm sách với populate uploadedBy
    const book = await Book.findOne({ _id: id, status: 'pending' }).populate('uploadedBy', 'name email');
    if (!book) {
      req.flash('error', 'Không tìm thấy sách hoặc sách không đang chờ phê duyệt!');
      return res.redirect('/admin');
    }

    let fileContent = '';

    // 1. Xử lý file nếu có fileUrl
    if (book.fileUrl) {
      // Chuẩn hóa fileUrl: loại bỏ hoàn toàn tiền tố '/uploads/' hoặc 'uploads/'
      const fileName = book.fileUrl.replace(/^(?:\/)?(?:uploads\/)?/, '').replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), 'Uploads', fileName);
      console.log('🔍 Kiểm tra book.fileUrl:', book.fileUrl); // Debug fileUrl gốc
      console.log('🔍 Kiểm tra fileName:', fileName); // Debug tên file sau khi xử lý
      console.log('🔍 Kiểm tra filePath:', filePath); // Debug đường dẫn file
      console.log('🔍 Thư mục gốc dự án:', process.cwd()); // Debug thư mục gốc

      try {
        if (fs.existsSync(filePath)) {
          console.log('✅ File tồn tại tại:', filePath);
          if (book.fileUrl.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await PDFParse(dataBuffer, { max: 10 }); // Giới hạn 10 trang
            fileContent = data.text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\r?\n/g, '<br>')
              .replace(/<br>\s*<br>/g, '<br><br>');
          } else if (book.fileUrl.endsWith('.txt')) {
            let rawContent = fs.readFileSync(filePath, 'utf8');
            // Làm sạch TXT nếu cần (Project Gutenberg)
            const cleanStart = rawContent.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
            if (cleanStart !== -1) {
              rawContent = rawContent.substring(cleanStart);
              const cleanEnd = rawContent.lastIndexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
              if (cleanEnd !== -1) {
                rawContent = rawContent.substring(0, cleanEnd);
              }
              rawContent = rawContent.replace(/[\*\_\-]{3,}.*?[\*\_\-]{3,}/gs, '').trim();
            }
            fileContent = rawContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\r?\n/g, '<br>')
              .replace(/<br>\s*<br>/g, '<br><br>');
          } else {
            console.warn('⚠️ File không hỗ trợ:', fileName);
            fileContent = `<div class="alert alert-warning">File không hỗ trợ (chỉ PDF/TXT). Vui lòng tải file gốc để xem: <a href="/Uploads/${fileName}" target="_blank">Tải file</a></div>`;
          }
        } else {
          console.warn('⚠️ File không tồn tại tại:', filePath);
          fileContent = `<div class="alert alert-warning">File không tồn tại trên server: ${fileName}. Vui lòng kiểm tra upload hoặc tải file gốc: <a href="/Uploads/${fileName}" target="_blank">Tải file</a></div>`;
        }
      } catch (fileErr) {
        console.error('⚠️ Lỗi xử lý file:', fileErr.message);
        fileContent = `<div class="alert alert-danger">Lỗi đọc file: ${fileErr.message}. Vui lòng tải file gốc để xem: <a href="/Uploads/${fileName}" target="_blank">Tải file</a></div>`;
      }
    } else {
      console.log('🔍 Không có fileUrl, kiểm tra content/description');
    }

    // 2. Fallback: Nếu không có file hoặc lỗi, dùng book.content hoặc book.description
    if (!fileContent || fileContent.includes('alert')) {
      if (book.content && book.content.trim() !== '') {
        console.log('✅ Sử dụng book.content');
        fileContent = book.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r?\n/g, '<br>')
          .replace(/<br>\s*<br>/g, '<br><br>');
      } else if (book.description && book.description.trim() !== '') {
        console.log('✅ Sử dụng book.description');
        fileContent = book.description
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r?\n/g, '<br>')
          .replace(/<br>\s*<br>/g, '<br><br>');
      } else {
        console.warn('⚠️ Không có nội dung text hoặc file');
        fileContent = `<div class="alert alert-info">Không có nội dung text hoặc file để hiển thị. Vui lòng kiểm tra dữ liệu upload.</div>`;
      }
    }

    console.log('🔍 Nội dung hiển thị cho sách', book.title, ':', fileContent.substring(0, 50) + '...');

    // Render view
    res.render('books/detail', {
      book,
      fileContent,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Lỗi getPendingBookDetail:', err.message);
    req.flash('error', 'Lỗi tải chi tiết sách: ' + err.message);
    res.redirect('/admin');
  }
};
// =============================
// ✅ Duyệt sách
// =============================
exports.approveBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book || book.status !== "pending") {
      req.flash("error", "Sách không tồn tại hoặc đã được xử lý!");
      return res.redirect("/admin");
    }

    // Thêm category "Handwritten Books" nếu chưa có
    if (!book.category.includes("Handwritten Books")) {
      book.category.push("Handwritten Books");
    }

    book.status = "published";
    await book.save();

    req.flash("success", `Đã duyệt sách: "${book.title}"`);
    res.redirect("/admin");
  } catch (err) {
    console.error("Lỗi approveBook:", err);
    req.flash("error", "Lỗi duyệt sách!");
    res.redirect("/admin");
  }
};

// =============================
// ❌ Từ chối sách
// =============================
exports.rejectBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book || book.status !== "pending") {
      req.flash("error", "Sách không tồn tại hoặc đã được xử lý!");
      return res.redirect("/admin");
    }

    book.status = "rejected";
    await book.save();

    req.flash("error", `Đã từ chối sách: "${book.title}"`);  // Có thể gửi email notify user sau
    res.redirect("/admin");
  } catch (err) {
    console.error("Lỗi rejectBook:", err);
    req.flash("error", "Lỗi từ chối sách!");
    res.redirect("/admin");
  }
};


// Lấy danh sách tài khoản
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const users = await User.find()
      .sort({ lastLogin: -1 }) // Sắp xếp theo thời gian đăng nhập gần nhất
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / parseInt(limit));

    console.log('🔍 Số tài khoản tìm thấy:', users.length);
    console.log('📚 Chi tiết query:', { skip, limit });
    console.log('📊 Tổng tài khoản:', total);

    res.render('admin/users', {
      users,
      currentPage: parseInt(page),
      totalPages,
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Lỗi getUsers:', err);
    req.flash('error', 'Lỗi tải danh sách tài khoản!');
    res.redirect('/admin');
  }
};

// Xóa tài khoản
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      req.flash('error', 'Tài khoản không tồn tại!');
      return res.redirect('/admin/users');
    }

    // Kiểm tra nếu user là admin (ngăn xóa admin chính)
    if (user.role === 'admin') {
      req.flash('error', 'Không thể xóa tài khoản admin!');
      return res.redirect('/admin/users');
    }

    // Xóa tất cả sách của user (nếu cần)
    await Book.deleteMany({ uploadedBy: id });

    // Xóa tài khoản
    await User.findByIdAndDelete(id);

    req.flash('success', `Đã xóa tài khoản: "${user.email}"`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Lỗi deleteUser:', err);
    req.flash('error', 'Lỗi xóa tài khoản!');
    res.redirect('/admin/users');
  }
};