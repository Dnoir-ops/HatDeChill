module.exports = (req, res, next) => {
  console.log('🔐 AuthMiddleware Check:', {
    method: req.method,
    url: req.url,
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    userRole: req.session?.user?.role,
    sessionID: req.sessionID,
    cookies: req.headers.cookie ? 'Present' : 'Missing'
  });
const { type } = req.body;
  if (type === "register" || type === "reset") {
    const hasSession = type === "register"
      ? !!req.session.pendingUser
      : !!req.session.resetEmail;

    if (!hasSession) {
      return res.status(400).json({ success: false, message: "Phiên hết hạn." });
    }
    return next(); // ← Dừng ở đây nếu là OTP
  }
  
  // ✅ Kiểm tra session tồn tại và có user
  if (!req.session || !req.session.user) {
    console.log('❌ AUTH FAILED - No session or user');
    
    // Nếu là API request (fetch), trả JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ 
        message: 'Vui lòng đăng nhập',
        debug: {
          hasSession: !!req.session,
          hasUser: !!req.session?.user
        }
      });
    }
    
    // Nếu là page request, redirect
    req.flash('error', 'Vui lòng đăng nhập để truy cập chức năng này!');
    return res.redirect('/users/login');
  }

  // ✅ Kiểm tra role hợp lệ
  if (!['author', 'admin'].includes(req.session.user.role)) {
    console.log('❌ AUTH FAILED - Invalid role:', req.session.user.role);
    req.flash('error', 'Tài khoản của bạn không hợp lệ!');
    return res.redirect('/users/login');
  }
  
  // ✅ Gán req.user và tiếp tục
  req.user = req.session.user;
  console.log('✅ AUTH PASSED - User:', req.user.email);
  next();
};
