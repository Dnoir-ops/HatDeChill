const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
// Đăng ký
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });
    const user = new User({ name, email, password, role: 'author' }); // ✅ Explicit set role 'author' (dù default cũng vậy)
    await user.save();
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
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