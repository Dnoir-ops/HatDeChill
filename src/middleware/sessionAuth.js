// middleware/sessionAuth.js
// MIDDLEWARE CHÍNH – XỬ LÝ FLASH, LOCALS, XÓA FLASH SAU KHI DÙNG
module.exports = (req, res, next) => {
  // 1. GÁN USER ĐỂ DÙNG TRONG EJS
  res.locals.user = req.session?.user || null;

  // 2. LẤY FLASH MESSAGE (có thể có nhiều)
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');

  // 3. XÓA FLASH SAU KHI DÙNG → TRÁNH DÍNH LỖI "EMAIL ĐÃ TỒN TẠI"
  req.flash('error');
  req.flash('success');

  // 4. (TÙY CHỌN) KIỂM TRA LOGIN CHO API – GIỮ LẠI PHẦN CŨ CỦA BẠN
  if (!req.session?.user) {
    // Nếu là API request → trả JSON
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ 
        message: 'Bạn cần đăng nhập',
        redirect: '/users/login'
      });
    }
    // Nếu là page → vẫn để flash ở trên xử lý
  }

  next();
};