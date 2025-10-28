require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { DOMMatrix, ImageData, Path2D } = require("canvas");

if (!global.DOMMatrix) global.DOMMatrix = DOMMatrix;
if (!global.ImageData) global.ImageData = ImageData;
if (!global.Path2D) global.Path2D = Path2D;
const cors = require("cors");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const Book = require("./models/Book");
const sessionAuth = require("./middleware/sessionAuth");
const roleMiddleware = require("./middleware/roleMiddleware");
// Models & utils
const UserModel = require("./models/User");
const { sendOTP } = require("./utils/mailer");
const { generateOTP } = require("./utils/otp");




const app = express();

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

// =============================
// ⚙️ Cấu hình view engine & layout
// =============================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// =============================
// 🧩 Middleware cơ bản
// =============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5000', // ✅ Chỉ định rõ origin
  credentials: true, // ✅ Cho phép gửi cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
// ✅ Xử lý preflight request cho CORS
app.options('*', cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  session({
    secret: process.env.JWT_SECRET || "a_very_secure_secret_key_12345",
    resave: true, // ✅ Đổi thành true để session được lưu lại
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // TỰ BẬT HTTPS
      sameSite: "lax",
    },
  })
);
app.set('trust proxy', 1);
app.use((req, res, next) => {
  console.log('🔍 Session Debug:', {
    sessionID: req.sessionID,
    hasUser: !!req.session.user,
    userInfo: req.session.user || 'No user'
  });
  next();
});

app.use(flash());

// 🪶 Gửi biến user + flash message đến mọi view
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  res.locals.error = req.flash("error") || [];
  res.locals.success = req.flash("success") || [];
  next();
});

// =============================
// KẾT NỐI MONGODB – GỘP TỪ ENV
// =============================
const MONGO_USER = encodeURIComponent(process.env.MONGO_USER || '');
const MONGO_PASS = encodeURIComponent(process.env.MONGO_PASS || '');
const MONGO_HOST = process.env.MONGO_HOST || '';
const MONGO_DB = process.env.MONGO_DB || '';
const MONGO_OPTIONS = process.env.MONGO_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0';

if (!MONGO_USER || !MONGO_PASS || !MONGO_HOST || !MONGO_DB) {
  console.error('MISSING MONGO ENV VARS!');
  process.exit(1);
}

const MONGO_URI = `mongodb+srv://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}/${MONGO_DB}?${MONGO_OPTIONS}`;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
// Trang chủ

app.get("/", async (req, res) => {
  try {
    const books = await Book.find().limit(16); // ✅ Lấy 16 quyển đầu tiên
    res.render("index", { user: req.session.user, books }); // ✅ Gửi qua view
  } catch (error) {
    console.error("Lỗi khi load sách:", error);
    res.render("index", { user: req.session.user, books: [] });
  }
});

// ======= ADMIN ROUTES ========
const adminController = require("./controllers/adminController"); // Import mới

app.get("/admin", requireRole(["admin"]), adminController.getPendingBooks);
app.post(
  "/admin/approve/:id",
  requireRole(["admin"]),
  adminController.approveBook
);
app.post(
  "/admin/reject/:id",
  requireRole(["admin"]),
  adminController.rejectBook
);
app.get("/admin/book/:id", requireRole(["admin"]), adminController.getPendingBookDetail);
app.get("/admin/users", requireRole(["admin"]), adminController.getUsers); // Thêm route để lấy danh sách tài khoản
app.post("/admin/users/delete/:id", requireRole(["admin"]), adminController.deleteUser); // Thêm route để xóa tài khoản

// ======= BOOKS =======

// ======= MIDDLEWARE PHÂN QUYỀN =======
function requireRole(roles) {
  return (req, res, next) => {
    if (
      !req.session.user ||
      (roles && !roles.includes(req.session.user.role))
    ) {
      req.flash('error', 'Không đủ quyền truy cập!'); // ✅ Cải thiện message
      return res.redirect('/users/login'); // Redirect thay vì status 403 để thân thiện hơn
    }
    next();
  };
}

// ======= CÁC ROUTE CẦN QUYỀN =======
app.get("/books/upload", requireRole(["author", "admin"]), (req, res) =>
  res.render("books/upload")
);

app.get(
  "/books/:id/comments",
  requireRole(["author", "admin"]),
  (req, res) => res.render("comments/list")
);
// 👤 AUTH & USER ROUTES
// =============================
// Đăng ký
app.get("/users/register", (req, res) => {
  // Bỏ { error: null, success: null } để middleware global handle flash
  if (req.session.user) return res.redirect("/"); // Thêm: Đã login thì về home
  res.render("users/register"); // Không pass error/success → Dùng res.locals từ flash
});

app.post("/users/register", async (req, res) => {
  // Kiểm tra nếu đã login
  if (req.session.user) {
    req.flash("error", "Bạn đã đăng nhập rồi!");
    return res.redirect("/");
  }

const { name, email, password, role = "author" } = req.body; // Default role

  // Validation cơ bản
  if (!name || !email || !password || password.length < 6) {
    req.flash("error", "Tên, email và mật khẩu (ít nhất 6 ký tự) là bắt buộc!");
    return res.redirect("/users/register");
  }

  const exists = await UserModel.findOne({ email });
  if (exists) {
    req.flash("error", "Email đã tồn tại!");
    return res.redirect("/users/register");
  }

  try {
    // ❌ Bỏ hash thủ công: Để pre-save hook lo
    // const hashedPassword = await bcrypt.hash(password, 10);  // Xóa dòng này

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    const user = new UserModel({
      name,
      email,
      password, // ✅ Plain password → hook sẽ hash khi save
      role,
      otp,
      otpExpires,
      isVerified: false,
    });

    // Lưu user (hook hash tự động)
    await user.save();

    // Gửi OTP và rollback nếu fail
    try {
      await sendOTP(email, otp); // Giả sử sendOTP là async
    } catch (sendErr) {
      await UserModel.findByIdAndDelete(user._id); // Rollback
      console.error("Lỗi gửi OTP:", sendErr);
      req.flash("error", "Lỗi gửi OTP! Vui lòng thử lại.");
      return res.redirect("/users/register");
    }

    req.session.pendingEmail = email;
    req.flash(
      "success",
      "Đã gửi mã OTP đến email. Vui lòng kiểm tra và xác thực trong 10 phút."
    );
    return res.redirect("/users/verify-otp");
  } catch (err) {
    console.error("Register error:", err);
    req.flash("error", "Lỗi đăng ký! Vui lòng thử lại.");
    res.redirect("/users/register");
  }
});

// Xác thực OTP (giữ nguyên, chỉ thêm check session nếu cần)
app.get("/users/verify-otp", (req, res) => {
  if (!req.session.pendingEmail) return res.redirect("/users/register");
  res.render("users/verify-otp"); // Không override
});

app.post("/users/verify-otp", async (req, res) => {
  const { otp } = req.body;
  const email = req.session.pendingEmail;
  if (!email) return res.redirect("/users/register");
  const user = await UserModel.findOne({ email });
  if (!user) {
    req.flash("error", "Không tìm thấy tài khoản!");
    return res.redirect("/users/register");
  }
  if (user.isVerified) {
    req.flash("success", "Tài khoản đã xác thực, hãy đăng nhập!");
    return res.redirect("/users/login");
  }
  if (user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
    req.flash("error", "OTP không đúng hoặc đã hết hạn!");
    return res.redirect("/users/verify-otp");
  }
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
  delete req.session.pendingEmail;
  req.flash("success", "Xác thực thành công! Bạn có thể đăng nhập.");
  res.redirect("/users/login");
});

// Đăng nhập
app.get("/users/login", (req, res) => {
  // Bỏ { error: null }
  if (req.session.user) return res.redirect("/"); // Thêm: Tránh loop nếu đã login
  res.render("users/login"); // Không pass error → Dùng res.locals.error từ flash
});

app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // Thêm validation cơ bản
    req.flash("error", "Vui lòng nhập đầy đủ email và mật khẩu!");
    return res.redirect("/users/login");
  }
  const user = await UserModel.findOne({ email });
  if (!user) {
    req.flash("error", "Email không tồn tại!"); // Hoặc 'Email hoặc mật khẩu không đúng!' để bảo mật hơn
    return res.redirect("/users/login");
  }
  if (!user.isVerified) {
    req.session.pendingEmail = email;
    req.flash("error", "Tài khoản chưa xác thực OTP. Vui lòng xác thực email!");
    return res.redirect("/users/verify-otp");
  }
 const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    req.flash("error", "Mật khẩu không đúng!");
    return res.redirect("/users/login");
    user.lastLogin = new Date();
  await user.save();

  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  }
    // CẬP NHẬT THỜI GIAN ĐĂNG NHẬP
  user.lastLogin = new Date();
  await user.save();
  // ✅ Lưu session và chờ callback
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  
  // ✅ Bắt buộc lưu session trước khi redirect
  req.session.save((err) => {
    if (err) {
      console.error('❌ Lỗi lưu session:', err);
      req.flash("error", "Lỗi đăng nhập, vui lòng thử lại!");
      return res.redirect("/users/login");
    }
    console.log('✅ Session saved:', req.session.user);
    req.flash("success", "Đăng nhập thành công!");
    res.redirect("/");
  });
});

// Đăng xuất
app.get("/users/logout", (req, res) => {
  // Hoặc đổi sang POST nếu lo CSRF
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/"); // Fallback nếu lỗi
    }
    res.redirect("/users/login");
  });
});
// ======= PROFILE =======
app.get(
  "/users/profile",
  requireRole(["author", "admin"]),
  (req, res) => {
    res.render("users/profile", { user: req.session.user, error: null });
  }
);

app.post(
  "/users/profile",
  requireRole([ "author", "admin"]),
  async (req, res) => {
    const { name, email, password, oldPassword } = req.body;
    try {
      const updateData = { name, email };
      let user = await UserModel.findById(req.session.user.id);

      if (password && password.length >= 6) {
        if (!oldPassword) {
          req.flash("error", "Vui lòng nhập mật khẩu hiện tại!");
          return res.redirect("/users/profile");
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          req.flash("error", "Mật khẩu hiện tại không đúng!");
          return res.redirect("/users/profile");
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      user = await UserModel.findByIdAndUpdate(
        req.session.user.id,
        updateData,
        { new: true }
      );
      req.session.user.name = user.name;
      req.session.user.email = user.email;
      req.flash("success", "Cập nhật thành công!");
      res.redirect("/users/profile");
    } catch (err) {
      console.error(err);
      req.flash("error", "Lỗi cập nhật!");
      res.redirect("/users/profile");
    }
  }
);

// ======= QUÊN MẬT KHẨU =======
app.get("/users/forgot-password", (req, res) =>
  res.render("users/forgot-password")
);

app.post("/users/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    req.flash("error", "Email không tồn tại!");
    return res.redirect("/users/forgot-password");
  }
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendOTP(email, otp);
  req.session.resetEmail = email;
  req.flash(
    "success",
    "Đã gửi mã OTP đến email. Vui lòng kiểm tra và xác thực."
  );
  res.redirect("/users/reset-otp");
});

app.get("/users/reset-otp", (req, res) => {
  if (!req.session.resetEmail) return res.redirect("/users/forgot-password");
  res.render("users/reset-otp");
});

app.post("/users/reset-otp", async (req, res) => {
  const { otp } = req.body;
  const email = req.session.resetEmail;
  if (!email) return res.redirect("/users/forgot-password");
  const user = await UserModel.findOne({ email });
  if (
    !user ||
    user.otp !== otp ||
    !user.otpExpires ||
    user.otpExpires < new Date()
  ) {
    req.flash("error", "OTP không đúng hoặc đã hết hạn!");
    return res.redirect("/users/reset-otp");
  }
  req.session.allowReset = true;
  req.flash("success", "Xác thực OTP thành công! Hãy đặt lại mật khẩu mới.");
  res.redirect("/users/reset-password");
});

app.get("/users/reset-password", (req, res) => {
  if (!req.session.resetEmail || !req.session.allowReset)
    return res.redirect("/users/forgot-password");
  res.render("users/reset-password");
});

app.post("/users/reset-password", async (req, res) => {
  const { password } = req.body;
  const email = req.session.resetEmail;
  if (!email || !req.session.allowReset)
    return res.redirect("/users/forgot-password");

  const user = await UserModel.findOne({ email });
  if (!user) {
    req.flash("error", "Không tìm thấy tài khoản!");
    return res.redirect("/users/forgot-password");
  }

  user.password = password;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  delete req.session.resetEmail;
  delete req.session.allowReset;
  req.flash("success", "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.");
  res.redirect("/users/login");
});

// =============================
// 🔗 API ROUTES
// =============================
const favoritesRouter = require("./routes/favorites");
app.use("/favorites", (req, res, next) => {
  console.log('🔗 Favorites route hit:', {
    method: req.method,
    url: req.url,
    fullUrl: req.originalUrl,
    hasSession: !!req.session,
    hasUser: !!req.session?.user
  });
  next();
}, favoritesRouter);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/books", require("./routes/books"));
app.use("/api", require("./routes/comments"));
app.use('/favorites', favoritesRouter);

// =============================
// ⚠️ ERROR HANDLER
// =============================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Lỗi server", error: err.message });
});

// =============================
// 🚀 START SERVER
// =============================
const bookRoutes = require("./routes/books");
app.use("/books", bookRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));

// DEBUG ROUTE - XÓA SAU KHI FIX XONG
app.get("/debug", async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.send("Chỉ chạy trên deploy!");
  }

  const testEmail = "debug-test-unique-" + Date.now() + "@example.com";

  try {
    const existing = await UserModel.findOne({ email: testEmail });
    res.json({
      message: "Kiểm tra debug",
      test_email: testEmail,
      user_exists_in_db: !!existing,
      flash_error: req.flash("error"),
      flash_success: req.flash("success"),
      session_id: req.sessionID,
      session_user: req.session.user || null,
      env: process.env.NODE_ENV,
      tip: "Dùng email này để test: " + testEmail
    });
  } catch (err) {
    res.json({ error: err.message });
  }//test
});