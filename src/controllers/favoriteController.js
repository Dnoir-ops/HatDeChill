const Favorite = require('../models/Favorite');
const Book = require('../models/Book');
const axios = require('axios');

// ===== GET FAVORITES LIST =====
exports.getFavorites = async (req, res) => {
  console.log('===== GET FAVORITES START =====');
  
  try {
    console.log('1️⃣ Checking session:', {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id
    });

    if (!req.session.user) {
      console.log('❌ No user in session - redirecting to login');
      req.flash('error', 'Vui lòng đăng nhập để xem danh sách yêu thích');
      return res.redirect('/users/login');
    }

    const { search = '', category = 'all', page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    const userId = req.session.user.id;

    console.log('2️⃣ Query params:', { search, category, page, limit, skip, userId });

    // ✅ Lấy tất cả favorites của user
    console.log('3️⃣ Fetching favorites from DB...');
    const favorites = await Favorite.find({ user: userId });
    console.log('4️⃣ Favorites found:', favorites.length);
    console.log('📋 Favorite objects:', JSON.stringify(favorites, null, 2));

    if (favorites.length === 0) {
      console.log('⚠️ No favorites found for user');
      return res.render('favorites/list', {
        books: [],
        categories: [
          "Romance", "Mystery/Detective", "Fantasy/Science Fiction",
          "Thrillers/Horror", "Self-help/Inspirational",
          "Biography, Autobiography & Memoir", "Business & Finance",
          "Children's & Young Adult - YA", "Science, Education & History",
          "Classics", "Handwritten Books"
        ],
        currentCategory: 'all',
        search: '',
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        limit: 12,
        user: req.session.user,
        favoriteBooks: [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    }

    const favoriteBookIds = favorites.map(fav => fav.book);
    console.log('5️⃣ Book IDs to fetch:', favoriteBookIds);

    let books = [];

    // ✅ Lấy thông tin chi tiết của từng sách
    for (let i = 0; i < favoriteBookIds.length; i++) {
  const bookId = favoriteBookIds[i];
  console.log(`6️⃣ Processing book ${i + 1}/${favoriteBookIds.length}:`, bookId);

  try {
    // Nếu là sách từ API (có format works/...)
    if (bookId.startsWith('works/') || bookId.startsWith('/works/')) {
      console.log('   → Fetching from OpenLibrary API...');
      
      // ✅ FIX: Clean ID đúng format: luôn '/works/OL...' (loại bỏ / đầu nếu có)
      let cleanId = bookId.replace(/^\/+/, '');  // Loại bỏ / đầu nếu có (e.g. '/works/' → 'works/')
      cleanId = `/works/${cleanId.split('/')[1] || cleanId}`.replace(/^\/+/, '/');  // Đảm bảo '/works/OL...'
      const apiUrl = `https://openlibrary.org${cleanId}.json`;
      console.log('   → API URL:', apiUrl);
      
      // ✅ Thêm timeout và error handling tốt hơn
      const response = await axios.get(apiUrl, { 
        timeout: 5000,  // 5s timeout
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookApp/1.0)' }  // Tránh rate limit
      });
      const bookData = response.data;
      
      // ✅ Mapping field an toàn hơn
      const book = {
        _id: bookId,  // Giữ nguyên ID gốc
        title: bookData.title || 'Unknown Title',
        author: Array.isArray(bookData.authors) && bookData.authors[0]?.key 
          ? 'Unknown Author'  // Có thể fetch author detail nếu cần, nhưng giữ đơn giản
          : bookData.authors?.[0]?.name || 'Unknown Author',
        category: Array.isArray(bookData.subjects) ? bookData.subjects.slice(0, 3) : ['Unknown'],
        cover_i: Array.isArray(bookData.covers) ? bookData.covers[0] : null,
        isFromAPI: true,
        description: (typeof bookData.description === 'object' ? bookData.description.value : bookData.description) || 'Chưa có mô tả'
      };
      
      books.push(book);
      console.log('   ✅ Added API book:', book.title);
    } 
    // Nếu là sách từ database
    else {
      console.log('   → Fetching from local DB...');
      const book = await Book.findById(bookId);
      
      if (book) {
        books.push({
          ...book.toObject(),
          isFromAPI: false
        });
        console.log('   ✅ Added DB book:', book.title);
      } else {
        console.log('   ⚠️ Book not found in DB:', bookId);
        // ✅ Tùy chọn: Xóa favorite nếu sách DB bị xóa
        await Favorite.deleteOne({ user: userId, book: bookId });
      }
    }
  } catch (error) {
    console.error(`   ❌ Error processing book ${bookId}:`, error.message);
    if (error.response?.status === 404) {
      console.log('   → Book ID không tồn tại trên API, xóa favorite?');
      // Tùy chọn: Xóa favorite invalid
      // await Favorite.deleteOne({ user: userId, book: bookId });
    }
    // ✅ Fallback: Không add, nhưng log để debug
  }
}

    console.log('7️⃣ Total books loaded:', books.length);

    // Lọc theo tìm kiếm và category
    if (search) {
      books = books.filter(book =>
        book.title?.toLowerCase().includes(search.toLowerCase()) ||
        book.author?.toLowerCase().includes(search.toLowerCase())
      );
      console.log('8️⃣ After search filter:', books.length);
    }

    if (category !== 'all') {
      books = books.filter(book =>
        Array.isArray(book.category) && book.category.includes(category)
      );
      console.log('9️⃣ After category filter:', books.length);
    }

    // Phân trang
    const paginatedBooks = books.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(books.length / parseInt(limit));

    console.log('🔟 Rendering view with:', {
      totalBooks: books.length,
      paginatedBooks: paginatedBooks.length,
      currentPage: parseInt(page),
      totalPages
    });

    res.render('favorites/list', {
      books: paginatedBooks,
      categories: [
        "Romance", "Mystery/Detective", "Fantasy/Science Fiction",
        "Thrillers/Horror", "Self-help/Inspirational",
        "Biography, Autobiography & Memoir", "Business & Finance",
        "Children's & Young Adult - YA", "Science, Education & History",
        "Classics", "Handwritten Books"
      ],
      currentCategory: category || 'all',
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      hasNextPage: parseInt(page) < totalPages,
      limit: parseInt(limit),
      user: req.session.user,
      favoriteBooks: favoriteBookIds,
      success: req.flash('success'),
      error: req.flash('error')
    });

    console.log('===== GET FAVORITES END =====');
  } catch (error) {
    console.error('❌❌❌ FATAL ERROR in getFavorites:', error);
    console.error('Stack trace:', error.stack);
    req.flash('error', 'Không thể tải danh sách yêu thích: ' + error.message);
    res.redirect('/books');
  }
};

// ===== ADD FAVORITE =====
exports.addFavorite = async (req, res) => {
  try {
    console.log('➕ addFavorite called:', {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id,
      bookId: req.params.bookId
    });

    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        message: 'Vui lòng đăng nhập để thêm sách vào yêu thích' 
      });
    }

    const { bookId } = req.params;
    const userId = req.session.user.id;

    // ✅ Kiểm tra xem đã yêu thích chưa
    const existingFavorite = await Favorite.findOne({ 
      user: userId, 
      book: bookId 
    });

    if (existingFavorite) {
      console.log('⚠️ Book already favorited');
      return res.status(400).json({ 
        message: 'Sách đã có trong danh sách yêu thích' 
      });
    }

    // ✅ Tạo favorite mới
    const favorite = new Favorite({
      user: userId,
      book: bookId
    });

    await favorite.save();
    console.log('✅ Favorite saved:', favorite._id);

    res.status(200).json({ 
      message: 'Đã thêm sách vào danh sách yêu thích',
      favoriteId: favorite._id
    });
  } catch (error) {
    console.error('❌ Error in addFavorite:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi thêm sách vào yêu thích',
      error: error.message 
    });
  }
};

// ===== REMOVE FAVORITE =====
exports.removeFavorite = async (req, res) => {
  try {
    console.log('🗑️ removeFavorite called:', {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id,
      bookId: req.params.bookId
    });

    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        message: 'Vui lòng đăng nhập để xóa sách khỏi yêu thích' 
      });
    }

    const { bookId } = req.params;
    const userId = req.session.user.id;

    const result = await Favorite.deleteOne({ 
      user: userId, 
      book: bookId 
    });

    if (result.deletedCount === 0) {
      console.log('⚠️ Favorite not found');
      return res.status(404).json({ 
        message: 'Không tìm thấy sách trong danh sách yêu thích' 
      });
    }

    console.log('✅ Favorite removed');
    res.status(200).json({ 
      message: 'Đã xóa sách khỏi danh sách yêu thích' 
    });
  } catch (error) {
    console.error('❌ Error in removeFavorite:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi xóa sách khỏi yêu thích',
      error: error.message 
    });
  }
};

module.exports = exports;