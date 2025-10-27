const Book = require("../models/Book");
const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const upload = require("../middleware/uploadMiddleware"); // ✅ Multer config
const axios = require("axios");
const Comment = require('../models/Comment');  // ✅ Thêm dòng này
const cheerio = require("cheerio"); // Đã import nhưng không cần dùng Cheerio cho cách lấy TXT này


const defaultCategories = [
  "Romance",
  "Mystery/Detective",
  "Fantasy/Science Fiction",
  "Thrillers/Horror",
  "Self-help/Inspirational",
  "Biography, Autobiography & Memoir",
  "Business & Finance",
  "Children's & Young Adult - YA",
  "Science, Education & History",
  "Classics",
  "Handwritten Books"
];


// =============================
// 🔍 Tìm sách từ API (Open Library) và render list
// =============================
exports.getBooksFromAPI = async (req, res) => {
  try {
    const { query = "", category = "", page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let apiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`;

    if (category !== "all") {
      apiUrl += `+subject:${encodeURIComponent(category)}`;
    }
    
    // ✅ Thêm &fields để lấy subjects
    apiUrl += `&limit=${limit}&offset=${skip}&fields=key,title,author_name,cover_i,first_publish_year,subject,ia`;

    const response = await axios.get(apiUrl);
    const apiBooks = response.data.docs;

    console.log('=== WITH FIELDS PARAM ===');
    if (apiBooks.length > 0) {
      console.log('📚 Sample:', apiBooks[0]);
      console.log('🏷️ subject:', apiBooks[0].subject);
    }
    // Map sang format Book của bạn (lưu tạm vào array, không lưu DB để đơn giản)
    const books = apiBooks.map((doc) => ({
      _id: doc.key.replace(/^\//, ""),
      title: doc.title || "Unknown Title",
      author: doc.author_name ? doc.author_name[0] : "Unknown Author",
      category: doc.subjects || ["Unknown"],
      cover_i: doc.cover_i || null,
      ia_id: doc.ia || null
    }));

    return res.render("books/list", {
      books,
      categories: defaultCategories,
      currentCategory: category || "all",
      search: query || "",
      currentPage: parseInt(page),
      totalPages: Math.ceil(response.data.numFound / limit),
      hasNextPage: parseInt(page) < Math.ceil(response.data.numFound / limit),
      limit: parseInt(limit),
      user: req.session.user ? req.session.user : null
    });
  } catch (err) {
    console.error('❌ Lỗi getBooksFromAPI:', err.message);
    req.flash('error', 'Không thể tải danh sách sách từ API. Vui lòng thử lại.');
    res.redirect('/books');
  }
};;

// =============================
// 📚 Lấy danh sách sách công khai (merge API + DB, fix pagination)
// =============================

exports.getBooks = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    let allBooks = [];
    let currentCategory = category || "all";
    let searchTerm = search || "";
    const apiLimitBuffer = 24;

    // ✅ CAS 1: "Handwritten Books" → CHỈ DB (giữ nguyên như cũ)
    if (currentCategory === "Handwritten Books") {
      console.log('Fetch ONLY local handwritten books');
      
      let dbQuery = {
        status: "published",
        $or: [
          { content: { $exists: true, $ne: "" } },
          { fileUrl: { $exists: true, $ne: "" } }
        ]
      };

      if (searchTerm && searchTerm.trim() !== "") {
        dbQuery.$and = [
          dbQuery.$and || {},
          {
            $or: [
              { title: { $regex: searchTerm.trim(), $options: "i" } },
              { author: { $regex: searchTerm.trim(), $options: "i" } }
            ]
          }
        ];
      }

      const dbBooks = await Book.find(dbQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      allBooks = dbBooks;
      const dbTotal = await Book.countDocuments(dbQuery);
      const totalPages = Math.ceil(dbTotal / parseInt(limit));

      return res.render("books/list", {
        books: allBooks,
        categories: defaultCategories,
        currentCategory: "Handwritten Books",
        search: searchTerm,
        currentPage: parseInt(page),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        limit: parseInt(limit),
        user: req.session.user || null
      });
    }

    // ✅ CAS 2: Các thể loại khác → API + DB (nếu DB có category trùng)
    let dbBooks = [];
    let dbTotal = 0;

    // Query DB: chỉ lấy sách published, có category trùng với currentCategory (nếu không phải "all")
    let dbQuery = { status: "published" };
    if (currentCategory !== "all") {
      dbQuery.category = currentCategory;
    }

    // Tìm kiếm title/author
    if (searchTerm && searchTerm.trim() !== "") {
      const searchRegex = { $regex: searchTerm.trim(), $options: "i" };
      dbQuery.$and = (dbQuery.$and || []).concat([
        {
          $or: [
            { title: searchRegex },
            { author: searchRegex }
          ]
        }
      ]);
    }

    dbBooks = await Book.find(dbQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    dbTotal = await Book.countDocuments(dbQuery);

    // Fetch API
    let safeQuery = searchTerm && searchTerm.trim() ? searchTerm.trim() : "fiction";
    safeQuery = encodeURIComponent(safeQuery.replace(/[^a-zA-Z0-9\s]/g, ''));
    const apiOffset = (page - 1) * apiLimitBuffer;

    let apiUrl = `https://openlibrary.org/search.json?q=${safeQuery}`;
    if (currentCategory !== "all") {
      apiUrl += `+subject:${encodeURIComponent(currentCategory)}`;
    }
    apiUrl += `&limit=${apiLimitBuffer}&offset=${apiOffset}&fields=key,title,author_name,cover_i,first_publish_year,subject`;

    let apiBooks = [];
    let apiEffectiveTotal = 0;

    try {
      const apiResponse = await axios.get(apiUrl, { timeout: 10000 });
      const apiBooksRaw = apiResponse.data.docs || [];

      apiBooks = apiBooksRaw.map((doc) => {
        let bookCategory = ['General'];
        if (doc.subject && Array.isArray(doc.subject) && doc.subject.length > 0) {
          bookCategory = doc.subject.slice(0, 3);
        }

        return {
          _id: doc.key.replace(/^\//, ""),
          title: doc.title || "Unknown Title",
          author: doc.author_name ? doc.author_name[0] : "Unknown Author",
          category: bookCategory,
          description: doc.description || "",
          previewUrl: null,
          cover_i: doc.cover_i || null,
          covers: doc.cover_i ? [doc.cover_i] : [],
          status: "published",
          isFromAPI: true
        };
      });
      apiEffectiveTotal = apiResponse.data.numFound || 0;
    } catch (apiErr) {
      console.warn('Lỗi fetch API:', apiErr.message);
      req.flash("error", "Không thể lấy dữ liệu từ Open Library. Chỉ hiển thị sách nội bộ.");
    }

    // ✅ Gộp DB + API
    allBooks = [...dbBooks, ...apiBooks];

    // Sắp xếp theo tiêu đề (có thể thay bằng createdAt nếu muốn ưu tiên sách mới)
    allBooks.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    // Cắt theo limit
    const start = skip;
    const end = start + parseInt(limit);
    const paginatedBooks = allBooks.slice(start, end);

    const total = dbTotal + apiEffectiveTotal;
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;

    return res.render("books/list", {
      books: paginatedBooks,
      categories: defaultCategories,
      currentCategory,
      search: searchTerm,
      currentPage: parseInt(page),
      totalPages,
      hasNextPage,
      limit: parseInt(limit),
      user: req.session.user || null
    });
  } catch (err) {
    console.error("Lỗi getBooks:", err);
    req.flash("error", "Không thể tải danh sách sách!");
    return res.render("books/list", {
      books: [],
      categories: defaultCategories,
      currentCategory: "all",
      search: "",
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      limit: 12,
      user: req.session.user || null
    });
  }
};

// 📦 Lấy sách của user (archive - draft + published)
// =============================
exports.getMyBooks = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Thêm pagination
    const skip = (page - 1) * parseInt(limit);
    const userId = req.session.user.id; // Lấy từ session (đã auth)

    // Query: Chỉ lấy sách của user này, bao gồm draft/pending/published
    const query = { 
      uploadedBy: userId, // ✅ FILTER CHÍNH - chỉ sách của user hiện tại
      // Không filter status để show tất cả (draft, pending, published)
    };

    const books = await Book.find(query)
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name email'); // Populate info user (dù là sách của chính user)

    const total = await Book.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Render view archive (giả sử bạn có `books/archive.ejs`)
    res.render('books/archive', { // Hoặc 'books/my-books' tùy view của bạn
      books,
      currentPage: parseInt(page),
      totalPages,
      limit: parseInt(limit),
      user: req.session.user // Pass user info cho view (nếu cần hiển thị tên, etc.)
    });
  } catch (err) {
    console.error('Lỗi getMyBooks:', err);
    req.flash('error', 'Không thể tải kho lưu trữ của bạn!');
    res.redirect('/books'); // Fallback về trang sách chính
  }
};
// =============================
// ✍️ Viết sách mới (text trực tiếp)
// =============================

exports.writeBook = async (req, res) => {
  try {
    const { title, author, category, description, content } = req.body;
    const finalAuthor = author && author.trim() !== '' ? author.trim() : req.session.user.name;
    
      let finalCategory = Array.isArray(category) ? category : [category || "General"];
    finalCategory = finalCategory.filter(c => c && c.trim() !== ""); // Lọc rỗng
    if (!finalCategory.includes("Handwritten Books")) {
      finalCategory.push("Handwritten Books");
    }
    
    const newBook = new Book({
      title,
      author: finalAuthor,
      category: finalCategory, // ✅ Inclut toujours "Handwritten Books"
      description,
      content,
      status: req.body.action === 'publish' ? 'pending' : 'draft',
      uploadedBy: req.session.user.id
    });
    await newBook.save();
    
    const message = req.body.action === 'publish' ? 'Đã gửi sách chờ duyệt!' : 'Đã lưu bản nháp!';
    req.flash('success', message);
    res.redirect('/books/archive');
  } catch (err) {
    console.error('Lỗi writeBook:', err);
    req.flash('error', 'Lỗi lưu sách!');
    res.redirect('/books/write');
  }
};


// =============================
// 📥 Upload sách mới (file)
// =============================
exports.uploadBook = [
  upload.single("file"),  // ✅ Multer middleware
  async (req, res) => {
    try {
      const { title, author, category } = req.body;
      const userId = req.session.user.id;
      const file = req.file;

      if (!title || !file) {
        req.flash("error", "Tiêu đề và file sách là bắt buộc!");
        return res.redirect("/books/upload");
      }

      // Xử lý PDF nếu cần (sửa lỗi PDFParse)
      let content = "";
      if (file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(file.path);
        const parser = new PDFParse({ data: dataBuffer });  // ✅ Khởi tạo đúng cách
        const data = await parser.getText();  // ✅ Gọi getText()
        await parser.destroy();  // ✅ Giải phóng bộ nhớ
        content = data.text;  // ✅ Lấy text từ result
      }

      const book = new Book({
        title,
        author,
        category: Array.isArray(category) ? category : [category],
        fileUrl: `/uploads/${file.filename}`,
        content,  // Nếu parse từ PDF
        status: "pending",  // ✅ Set pending để admin duyệt
        uploadedBy: req.session.user.id // ✅ SET USER ID
      });

      await book.save();
      req.flash("success", "Sách đã được gửi duyệt! Admin sẽ kiểm tra sớm.");
      res.redirect("/books/archive");
    } catch (err) {
      console.error("Lỗi uploadBook:", err);
      req.flash("error", "Lỗi upload sách!");
      res.redirect("/books/upload");
    }
  }
];
// =============================
// ✏️ Lấy sách để chỉnh sửa
// =============================
exports.editBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      req.flash("error", "Không tìm thấy sách!");
      return res.redirect("/books/archive");
    }

    if (
      req.session.user.role !== "admin" &&
      book.uploadedBy.toString() !== req.session.user.id
    ) {
      req.flash("error", "Bạn không có quyền chỉnh sửa sách này!");
      return res.redirect("/books/archive");
    }

    res.render("books/edit", { book });
  } catch (err) {
    console.error("Lỗi khi mở trang chỉnh sửa:", err);
    req.flash("error", "Không thể tải sách!");
    res.redirect("/books/archive");
  }
};

// =============================
// 💾 Cập nhật sách (lưu bản nháp hoặc đăng)
// =============================
exports.updateBook = async (req, res) => {
  try {
    const { title, author, category, description, content, action } = req.body;
    const bookId = req.params.id;
    const isAdmin = req.session.user?.role === "admin";

    const book = await Book.findById(bookId);
    if (!book) {
      req.flash("error", "Không tìm thấy sách!");
      return res.redirect("/books/archive");
    }

    if (
      !isAdmin &&
      book.uploadedBy.toString() !== req.session.user.id
    ) {
      req.flash("error", "Bạn không có quyền chỉnh sửa sách này!");
      return res.redirect("/books/archive");
    }

    // Fallback giá trị cũ để tránh validation error
    book.title = title && title.trim() ? title.trim() : book.title;
    book.author = author && author.trim() ? author.trim() : book.author;
    book.description = description && description.trim() ? description.trim() : book.description;

    // Xử lý category, làm phẳng mảng để tránh CastError
    if (category !== undefined) {
      const catValue = Array.isArray(category)
        ? category.flat().map(c => c.trim()).filter(c => c) // Làm phẳng và lọc giá trị rỗng
        : (category ? category.split(',').map(c => c.trim()).filter(c => c) : []);
      book.category = catValue.length > 0 ? catValue : book.category;
    }

    if (content) book.content = content; // Chỉ update nếu có

    // Logic status: Luôn pending khi publish, không publish trực tiếp
    if (action === "publish") {
      book.status = "pending"; // Gửi duyệt, kể cả admin
      req.flash("success", "📤 Sách đã được gửi duyệt! Admin sẽ kiểm tra sớm");
    } else {
      book.status = "draft"; // Lưu draft
      req.flash("success", "💾 Đã lưu bản nháp!");
    }

    await book.save();

    // Gợi ý check admin panel nếu pending và có 'Handwritten Books'
    if (book.status === "pending" && book.category.includes("Handwritten Books")) {
      req.flash("info", "📝 Sách 'Handwritten' của bạn đã gửi duyệt. Admin sẽ review sớm!");
    }
    res.redirect("/books/archive");
  } catch (err) {
    console.error("❌ Lỗi cập nhật sách:", err.message, err.stack);
    req.flash("error", `Lỗi khi cập nhật sách: ${err.message}`);
    return res.redirect("/books/archive");
  }
};

// =============================
// 🗑️ Xóa sách (với check quyền)
// =============================

exports.deleteBook = async (req, res) => {
    try {
        const bookId = req.params.id;
        console.log('🔍 Attempting to delete book:', bookId);

        // Cấm xóa sách từ API
        if (bookId.includes('works/')) {
            req.flash('error', 'Không thể xóa sách từ API!');
            return res.status(400).json({ message: 'Không thể xóa sách từ API!' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            req.flash('error', 'Không tìm thấy sách!');
            return res.status(404).json({ message: 'Không tìm thấy sách!' });
        }

        // Kiểm tra quyền
        if (
            req.session.user.role !== 'admin' &&
            book.uploadedBy.toString() !== req.session.user.id
        ) {
            req.flash('error', 'Bạn không có quyền xóa sách này!');
            return res.status(403).json({ message: 'Bạn không có quyền xóa sách này!' });
        }

        // Xóa file nếu tồn tại
        if (book.fileUrl) {
            const filePath = path.join(process.cwd(), book.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('🗑️ Deleted file:', filePath);
            }
        }

        // Xóa sách khỏi DB
        await Book.findByIdAndDelete(bookId);
        console.log('✅ Book deleted from DB:', bookId);

        // Thêm thông báo flash cho trang /books
        req.flash('success', 'Xóa sách thành công!');
        return res.status(200).json({ message: 'Xóa sách thành công!' });
    } catch (err) {
        console.error('❌ Error in deleteBook:', err);
        req.flash('error', 'Lỗi server khi xóa sách!');
        return res.status(500).json({ message: 'Lỗi server khi xóa sách!' });
    }
};
// =============================
// 📥 Tải xuống file sách
// =============================
exports.downloadBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || !book.fileUrl) {
      return res.status(404).send("Không tìm thấy file!");
    }

    // Check quyền: public hoặc owner/admin
    if (
      book.status !== "published" &&
      (!req.session.user ||
        (req.session.user.role !== "admin" &&
          book.uploadedBy.toString() !== req.session.user.id))
    ) {
      return res.status(403).send("Không có quyền tải file này!");
    }

    const filePath = path.join(process.cwd(), book.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File không tồn tại!");
    }

    res.download(filePath, `${book.title}.${path.extname(book.fileUrl)}`);
  } catch (err) {
    console.error("Lỗi download sách:", err);
    res.status(500).send("Lỗi tải file!");
  }
};

// =============================
// 📖 Xem chi tiết sách từ DB (local books)
// =============================
exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('uploadedBy', 'name');
        if (!book) {
            req.flash('error', 'Không tìm thấy sách!');
            return res.redirect('/books');
        }

        // Check quyền: published hoặc owner/admin (GIỮ NGUYÊN)
        if (
            book.status !== 'published' &&
            (!req.session.user ||
                (req.session.user.role !== 'admin' &&
                    book.uploadedBy._id.toString() !== req.session.user.id))
        ) {
            req.flash('error', 'Bạn không có quyền xem sách này!');
            return res.redirect('/books');
        }

        // Đọc nội dung file (GIỮ NGUYÊN LOGIC PDF/TXT)
        let fileContent = '';
        if (book.content) {
            fileContent = book.content;
        } else if (book.fileUrl) {
            const filePath = path.join(process.cwd(), book.fileUrl);
            if (fs.existsSync(filePath)) {
                const ext = path.extname(book.fileUrl).toLowerCase();
                if (ext === '.txt') {
                    fileContent = fs.readFileSync(filePath, 'utf8');
                } else if (ext === '.pdf') {
                    try {
                        const dataBuffer = fs.readFileSync(filePath);
                        const instance = new PDFParse({ data: dataBuffer });
                        const result = await instance.getText();
                        await instance.destroy();
                        fileContent = result.text;
                    } catch (pdfErr) {
                        console.error('Lỗi parse PDF:', pdfErr);
                        fileContent = 'Không thể đọc nội dung PDF.';
                    }
                } else {
                    fileContent = `File sách: ${book.fileUrl} - Tải xuống để xem.`;
                }
            } else {
                fileContent = 'File không tồn tại.';
            }
        } else {
            fileContent = 'Không có nội dung.';
        }

        // ✅ Fetch comments từ DB (SỬA ĐỂ TRÁNH LỖI)
        let comments = [];
        try {
            const bookId = req.params.id;
            comments = await Comment.find({ book: bookId })
                .populate('user', 'name')
                .sort({ createdAt: -1 });
            console.log(`✅ Fetch ${comments.length} comments từ DB cho sách DB ${bookId}`);
        } catch (commentErr) {
            console.warn('⚠️ Lỗi fetch comments từ DB:', commentErr.message);
            comments = [];
        }



        // ✅ RENDER DUY NHẤT 1 LẦN VỚI RETURN
        return res.render('books/detail', { 
            book, 
            fileContent, 
            comments: comments || [], 
            user: req.session.user || null 
        });

    } catch (err) {
        console.error('❌ Lỗi getBookById:', err);
        req.flash('error', 'Không thể tải sách!');
        return res.redirect('/books');
    }
};

// =============================
// 📖 Xem chi tiết sách từ API (Thử fetch nội dung FULL từ Internet Archive)
// =============================
exports.getBookByIdFromAPI = async (req, res) => {
    const { id } = req.params; // Example: 'works/OL39379W'
    let book = {};
    let fileContent = null;
    let authorName = 'Unknown Author';

    try {
        console.log('🌐 Fetching book from API:', id);

        // 1. Fetch book metadata from Open Library
        const metaUrl = `https://openlibrary.org/${id}.json`;
        const metaResponse = await axios.get(metaUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        const bookData = metaResponse.data;

        // Get author name
        if (bookData.authors && bookData.authors.length > 0 && bookData.authors[0].author && bookData.authors[0].author.key) {
            const authorKey = bookData.authors[0].author.key.replace(/^\//, '');
            try {
                const authorUrl = `https://openlibrary.org/${authorKey}.json`;
                const authorResponse = await axios.get(authorUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 15000
                });
                authorName = authorResponse.data.name || authorName;
            } catch (authorErr) {
                console.error('Error fetching author for key', authorKey, ':', authorErr.message);
                if (bookData.author_name && bookData.author_name.length > 0) {
                    authorName = bookData.author_name[0];
                }
            }
        } else if (bookData.author_name && bookData.author_name.length > 0) {
            authorName = bookData.author_name[0];
        }

        // Handle flexible description
        let descValue = '';
        if (bookData.description) {
            if (typeof bookData.description === 'string') {
                descValue = bookData.description;
            } else if (bookData.description && bookData.description.value) {
                descValue = bookData.description.value;
            }
        }
        const finalDesc = descValue || (bookData.notes || 'No description available.');

        // Find Internet Archive ID
        let iaId = bookData.ia_id || bookData.ocaid;
        if (!iaId && id.includes('works/')) {
            console.log('🔍 Searching for editions for work...');
            try {
                const editionsUrl = `https://openlibrary.org/${id}/editions.json`;
                const editionsResponse = await axios.get(editionsUrl, { timeout: 10000 });
                const editions = editionsResponse.data.entries || [];

                console.log(`📚 Found ${editions.length} editions`);

                for (const edition of editions) {
                    if (edition.ocaid) {
                        iaId = edition.ocaid;
                        console.log(`✅ Found IA ID from edition: ${iaId}`);
                        break;
                    }
                }
            } catch (editionErr) {
                console.warn('⚠️ Could not load editions:', editionErr.message);
            }
        }

        console.log('📖 Book ID:', id);
        console.log('📦 Final IA ID:', iaId);

        // Structure the book object
        book = {
            _id: id,
            title: bookData.title || 'Unknown Title',
            author: authorName,
            category: bookData.subjects ? bookData.subjects.slice(0, 3) : ['Unknown'],
            description: finalDesc,
            coverImage: bookData.covers && bookData.covers.length > 0 
                ? `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-M.jpg` 
                : null,
            previewUrl: bookData.preview_url || null,
            cover_i: bookData.covers ? bookData.covers[0] : null,
            isFromAPI: true,
            ia_id: iaId || null
        };

        // Declare contentUrl based on iaId
        let contentUrl = iaId ? `https://archive.org/stream/${iaId}/${iaId}_djvu.txt` : null;

        // If ia_id exists, prioritize the BookReader embed
        if (iaId) {
            console.log('✅ Using IA ID for embed:', iaId);
            book.ia_embed_url = `https://archive.org/embed/${iaId}?page=1`;
            book.reader_height = 600;
        } else {
            console.log('❌ No IA ID found, fallback to TXT');
            fileContent = '<div class="alert alert-info"><strong>📚 Online content not available</strong><br>This book has not been digitized or does not have a public full-text version.<br><br>Internet Archive ID (ia_id) is not available.</div>';
        }

        // Fallback: Fetch TXT if no embed
        if (!book.ia_embed_url && contentUrl) {
            console.log('🔗 Attempting to fetch TXT fallback from:', contentUrl);
            try {
                const contentResponse = await axios.get(contentUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 10000
                });

                let rawContent = contentResponse.data;
                console.log(`✅ Successfully fetched TXT fallback content`);
                console.log(`📏 Content length: ${rawContent.length} characters`);

                // Clean content
                const cleanStart = rawContent.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
                if (cleanStart !== -1) {
                    rawContent = rawContent.substring(cleanStart);
                    const cleanEnd = rawContent.lastIndexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
                    if (cleanEnd !== -1) {
                        rawContent = rawContent.substring(0, cleanEnd);
                    }
                    rawContent = rawContent.replace(/[\*\_\-]{3,}.*?[\*\_\-]{3,}/gs, '').trim();
                }

                // Convert plain text to HTML
                fileContent = rawContent
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\r?\n/g, '<br>')
                    .replace(/<br>\s*<br>/g, '<br><br>');
            } catch (contentErr) {
                console.warn('⚠️ Could not load TXT fallback:', contentErr.message);
                fileContent = '<div class="alert alert-warning"><strong>⚠️ Could not load full content</strong><br>This book does not have a free full-text version or it could not be accessed.<br><br>Please see the <strong>Description</strong> on the left.</div>';
            }
        }

        // Fetch comments from DB for API book
        let comments = [];
        try {
            const bookId = id; // Use API id
            comments = await Comment.find({ book: bookId })
                .populate('user', 'name')
                .sort({ createdAt: -1 });
            console.log(`✅ Fetched ${comments.length} comments from DB for API book ${bookId}`);
        } catch (commentErr) {
            console.warn('⚠️ Error fetching comments from DB:', commentErr.message);
            comments = [];
        }

        // RENDER ONLY ONCE WITH RETURN
        return res.render('books/detail', {
            book,
            fileContent: fileContent || '',
            comments: comments || [],
            user: req.session.user ? req.session.user : null // Ensure user is an object or null
        });

    } catch (err) {
        console.error('❌ Error in getBookByIdFromAPI (main):', err.message);
        console.error('Stack trace:', err.stack);
        req.flash('error', `Could not load details for book "${id}". Please try again.`);
        return res.redirect('/books');
    }
};



// =============================
// 🔍 Tìm kiếm sách
// =============================
exports.searchBooks = async (req, res) => {
  try {
    const { title, author, category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    let query = { status: "published" }; // ✅ chỉ sách đã đăng

    if (title && title.trim() !== "") {
      query.title = { $regex: title.trim(), $options: "i" };
    }
    if (author && author.trim() !== "") {
      query.author = { $regex: author.trim(), $options: "i" };
    }
    if (category && category !== "all") {
      const catArray = Array.isArray(category) ? category : category.split(",");
      query.category = { $in: catArray };
    }

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Book.countDocuments(query);
   // const categories = (await Book.distinct("category")).flat(); // ✅ Flat để lấy tất cả categories nếu là array
     const categories=categories;

    return res.render("books/list", {
      books,
      categories ,
      currentCategory: category || "all",
      search: title || author || "", // Fallback for view's search param
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Lỗi searchBooks:", err);
    req.flash("error", "Không thể tìm kiếm sách!");
    res.redirect("/books");
  }
};
