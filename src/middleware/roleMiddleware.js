const flash = require('connect-flash'); // Đảm bảo flash đã được setup trong app.js

module.exports = (roles) => {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user || !roles.includes(user.role)) {
      // Kiểm tra nếu là request web (HTML) thì redirect với flash, còn API thì JSON
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.flash('error', 'Không đủ quyền truy cập');
        return res.redirect('/'); // Hoặc '/users/login' nếu muốn
      }
      return res.status(403).json({ message: 'Không đủ quyền truy cập' });
    }
    next();
  };
};