const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const bcrypt = require('bcrypt');

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. CHUẨN HÓA EMAIL
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      if (isApiRequest(req)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }
      req.flash('error', 'Email không hợp lệ');
      return res.redirect('/users/register');
    }

    // 2. KIỂM TRA TRÙNG
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (isApiRequest(req)) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
      req.flash('error', 'Email đã được sử dụng');
      return res.redirect('/users/register');
    }

    // 3. MÃ HÓA MẬT KHẨU
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. TẠO USER
    const user = new User({
      name: name?.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'author' // hoặc 'reader' tùy bạn
    });
    await user.save();

    // 5. THÀNH CÔNG
    if (isApiRequest(req)) {
      return res.status(201).json({ 
        message: 'Đăng ký thành công',
        user: { id: user._id, email: user.email, role: user.role }
      });
    }

    req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
    return res.redirect('/users/login');

  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    if (isApiRequest(req)) {
      return res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
    req.flash('error', 'Lỗi server, vui lòng thử lại');
    return res.redirect('/users/register');
  }
};

// HÀM HỖ TRỢ: KIỂM TRA LÀ API HAY WEB
function isApiRequest(req) {
  return req.xhr || 
         req.headers.accept?.includes('json') || 
         req.originalUrl.startsWith('/api');
}
// Đăng nhập
exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
		const isMatch = await user.comparePassword(password);
		if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

		// Cập nhật thời gian đăng nhập gần nhất
		user.lastLogin = new Date();
		await user.save();

		// Set session cho web views (persist login)
		req.session.user = {
			id: user._id,
			name: user.name,
			email: user.email,
			role: user.role
		};

		// Tạo token cho API (nếu cần)
		const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

		// Nếu là request từ web (HTML), redirect về trang chủ; còn API thì JSON
		if (req.headers.accept && req.headers.accept.includes('text/html')) {
			req.flash('success', 'Đăng nhập thành công! Chào mừng bạn.');
			return res.redirect('/'); // Hoặc '/books' nếu muốn
		}

		res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server', error: err.message });
	}
};

// Đăng xuất
// Đăng xuất
exports.logout = async (req, res) => {
	try {
		// Flash message trước (nếu session tồn tại và là web request)
		if (req.session && req.headers.accept && req.headers.accept.includes('text/html')) {
			req.flash('success', 'Đăng xuất thành công!');
		}

		// Clear user từ session
		if (req.session) {
			req.session.user = null;
			req.session.destroy((err) => {
				if (err) {
					console.error('Lỗi xóa session:', err);
				}
			});
		}

		// Redirect cho web, JSON cho API
		if (req.headers.accept && req.headers.accept.includes('text/html')) {
			return res.redirect('/users/login'); // Hoặc '/' nếu muốn về trang chủ
		}

		res.json({ message: 'Đăng xuất thành công' });
	} catch (err) {
		console.error('Lỗi logout:', err);
		if (req.headers.accept && req.headers.accept.includes('text/html')) {
			req.flash('error', 'Lỗi khi đăng xuất!');
			return res.redirect('/'); // Fallback redirect nếu lỗi
		}
		res.status(500).json({ message: 'Lỗi server', error: err.message });
	}
};

// Xác thực token (dùng cho middleware)
exports.verifyToken = (token) => {
	return jwt.verify(token, JWT_SECRET);
};