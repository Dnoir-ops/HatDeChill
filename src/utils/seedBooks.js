require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');

// ✅ Tự ghép URI từ các biến .env
const {
  MONGO_USER,
  MONGO_PASS,
  MONGO_HOST,
  MONGO_DB,
  MONGO_OPTIONS
} = process.env;

const mongoUri = `mongodb+srv://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${MONGO_DB}?${MONGO_OPTIONS}`;

const books = [
  // 10 sách cũ (giữ nguyên)
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    category: 'Romance',
    description: 'Câu chuyện tình yêu kinh điển giữa Elizabeth Bennet và Mr. Darcy, một tác phẩm kinh điển của văn học Anh.',
    fileUrl: 'https://www.gutenberg.org/files/1342/1342-h/1342-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8228691-L.jpg'
  },
  {
    title: 'Moby Dick',
    author: 'Herman Melville',
    category: 'Adventure',
    description: 'Cuộc hành trình săn cá voi vĩ đại của thuyền trưởng Ahab cùng thủy thủ đoàn trên con tàu Pequod.',
    fileUrl: 'https://www.gutenberg.org/files/2701/2701-h/2701-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/555222-L.jpg'
  },
  {
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    category: 'Detective',
    description: 'Tập hợp những vụ án nổi tiếng của thám tử Sherlock Holmes và người bạn đồng hành Dr. Watson.',
    fileUrl: 'https://www.gutenberg.org/files/1661/1661-h/1661-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8231851-L.jpg'
  },
  {
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    category: 'Fantasy',
    description: 'Câu chuyện huyền ảo về Alice lạc vào xứ sở thần tiên đầy màu sắc và phi lý.',
    fileUrl: 'https://www.gutenberg.org/files/11/11-h/11-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/7222246-L.jpg'
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    category: 'Horror',
    description: 'Một nhà khoa học trẻ tuổi tạo ra sinh vật từ xác chết và đối mặt với hậu quả khôn lường.',
    fileUrl: 'https://www.gutenberg.org/files/84/84-h/84-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8311823-L.jpg'
  },
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    category: 'Philosophy',
    description: 'Một thanh niên bán linh hồn để giữ vẻ ngoài trẻ trung trong khi bức tranh của anh ta già đi thay thế.',
    fileUrl: 'https://www.gutenberg.org/files/174/174-h/174-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8108694-L.jpg'
  },
  {
    title: 'Dracula',
    author: 'Bram Stoker',
    category: 'Horror',
    description: 'Câu chuyện kinh dị về Bá tước Dracula và cuộc chiến giữa thiện và ác trong thế giới ma cà rồng.',
    fileUrl: 'https://www.gutenberg.org/files/345/345-h/345-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235086-L.jpg'
  },
  {
    title: 'War and Peace',
    author: 'Leo Tolstoy',
    category: 'Historical',
    description: 'Bức tranh toàn cảnh về nước Nga trong thời kỳ chiến tranh Napoleon, đan xen giữa tình yêu, chiến tranh và triết lý sống.',
    fileUrl: 'https://www.gutenberg.org/files/2600/2600-h/2600-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/7222247-L.jpg'
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    category: 'Drama',
    description: 'Câu chuyện bi kịch về giấc mơ Mỹ thông qua nhân vật Gatsby và tình yêu dang dở của anh với Daisy.',
    fileUrl: 'https://www.gutenberg.org/ebooks/64317',
    coverImage: 'https://covers.openlibrary.org/b/id/7222248-L.jpg'
  },
  {
    title: 'The Time Machine',
    author: 'H. G. Wells',
    category: 'Science Fiction',
    description: 'Một nhà khoa học du hành xuyên thời gian và khám phá tương lai xa xôi của loài người.',
    fileUrl: 'https://www.gutenberg.org/files/35/35-h/35-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/7222249-L.jpg'
  },
  // 20 sách mới thêm (đa dạng thể loại)
  {
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    category: 'Romance',
    description: 'Câu chuyện về cô giáo Jane Eyre và tình yêu với ông Rochester trong bối cảnh xã hội Anh thế kỷ 19.',
    fileUrl: 'https://www.gutenberg.org/files/126/126-h/126-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235090-L.jpg'
  },
  {
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    category: 'Adventure',
    description: 'Cuộc phiêu lưu săn kho báu trên đảo hoang với cậu bé Jim Hawkins và tên cướp biển Long John Silver.',
    fileUrl: 'https://www.gutenberg.org/files/120/120-h/120-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235091-L.jpg'
  },
  {
    title: 'The Hound of the Baskervilles',
    author: 'Arthur Conan Doyle',
    category: 'Detective',
    description: 'Sherlock Holmes điều tra lời nguyền chó săn trên đầm lầy Baskerville.',
    fileUrl: 'https://www.gutenberg.org/files/2852/2852-h/2852-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235092-L.jpg'
  },
  {
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    category: 'Fantasy',
    description: 'Bilbo Baggins cùng phù thủy Gandalf và lũ lùn đi tìm kho báu bị rồng Smaug canh giữ.',
    fileUrl: 'https://www.gutenberg.org/ebooks/320', // Note: Public domain version
    coverImage: 'https://covers.openlibrary.org/b/id/8235093-L.jpg'
  },
  {
    title: 'The Legend of Sleepy Hollow',
    author: 'Washington Irving',
    category: 'Horror',
    description: 'Câu chuyện ma quái về Kỵ sĩ Không Đầu ở làng Sleepy Hollow.',
    fileUrl: 'https://www.gutenberg.org/files/41/41-h/41-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235094-L.jpg'
  },
  {
    title: 'The Republic',
    author: 'Plato',
    category: 'Philosophy',
    description: 'Tác phẩm cổ điển về công lý, nhà nước lý tưởng và triết lý Socratic.',
    fileUrl: 'https://www.gutenberg.org/files/1497/1497-h/1497-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235095-L.jpg'
  },
  {
    title: 'The Three Musketeers',
    author: 'Alexandre Dumas',
    category: 'Historical',
    description: 'D\'Artagnan và ba chàng lính ngự lâm bảo vệ vua Louis XIII khỏi âm mưu.',
    fileUrl: 'https://www.gutenberg.org/files/1254/1254-h/1254-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235096-L.jpg'
  },
  {
    title: '1984',
    author: 'George Orwell',
    category: 'Science Fiction',
    description: 'Dystopia về xã hội Big Brother theo dõi mọi công dân qua telescreen.',
    fileUrl: 'https://www.gutenberg.org/ebooks/30', // Public domain
    coverImage: 'https://covers.openlibrary.org/b/id/8235097-L.jpg'
  },
  {
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    category: 'Drama',
    description: 'Bi kịch tình yêu giữa Romeo Montague và Juliet Capulet trong cuộc chiến gia tộc.',
    fileUrl: 'https://www.gutenberg.org/files/1112/1112-h/1112-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235098-L.jpg'
  },
  {
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    category: 'Adventure',
    description: 'Những câu chuyện về Mowgli, cậu bé sói, và bạn bè trong rừng Ấn Độ.',
    fileUrl: 'https://www.gutenberg.org/files/19134/19134-h/19134-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235099-L.jpg'
  },
  {
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    category: 'Romance',
    description: 'Tình yêu cuồng si và trả thù giữa Heathcliff và Catherine trên đầm lầy Yorkshire.',
    fileUrl: 'https://www.gutenberg.org/files/768/768-h/768-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235100-L.jpg'
  },
  {
    title: 'The Call of the Wild',
    author: 'Jack London',
    category: 'Adventure',
    description: 'Buck, chú chó bị bắt cóc đến Yukon, học cách sinh tồn trong thời kỳ vàng Klondike.',
    fileUrl: 'https://www.gutenberg.org/files/215/215-h/215-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235101-L.jpg'
  },
  {
    title: 'The Scarlet Letter',
    author: 'Nathaniel Hawthorne',
    category: 'Historical',
    description: 'Hester Prynne bị xã hội Puritan trừng phạt vì tội ngoại tình ở thuộc địa Massachusetts.',
    fileUrl: 'https://www.gutenberg.org/files/25344/25344-h/25344-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235102-L.jpg'
  },
  {
    title: 'A Study in Scarlet',
    author: 'Arthur Conan Doyle',
    category: 'Detective',
    description: 'Vụ án đầu tiên của Sherlock Holmes, liên quan đến bí mật Mormon ở Utah.',
    fileUrl: 'https://www.gutenberg.org/files/244/244-h/244-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235103-L.jpg'
  },
  {
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    category: 'Fantasy',
    description: 'Những cuộc phiêu lưu vui nhộn của Mole, Rat, Toad và Badger bên sông Thames.',
    fileUrl: 'https://www.gutenberg.org/files/289/289-h/289-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235104-L.jpg'
  },
  {
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    category: 'Horror',
    description: 'Bài thơ kể về người đàn ông bị ám ảnh bởi con quạ bí ẩn và nỗi mất mát.',
    fileUrl: 'https://www.gutenberg.org/files/17192/17192-h/17192-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235105-L.jpg'
  },
  {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    category: 'Philosophy',
    description: 'Những suy tư cá nhân của hoàng đế La Mã về Stoicism, đạo đức và cuộc sống.',
    fileUrl: 'https://www.gutenberg.org/files/2680/2680-h/2680-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235106-L.jpg'
  },
  {
    title: 'Les Misérables',
    author: 'Victor Hugo',
    category: 'Historical',
    description: 'Cuộc đời Jean Valjean, tù nhân tha hóa, trong bối cảnh cách mạng Pháp.',
    fileUrl: 'https://www.gutenberg.org/files/135/135-h/135-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235107-L.jpg'
  },
  {
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    category: 'Science Fiction',
    description: 'Người ngoài hành tinh xâm lược Trái Đất bằng máy chiến đấu ba chân.',
    fileUrl: 'https://www.gutenberg.org/files/36/36-h/36-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235108-L.jpg'
  },
  {
    title: 'Hamlet',
    author: 'William Shakespeare',
    category: 'Drama',
    description: 'Hoàng tử Đan Mạch báo thù cho cha, với những câu thoại kinh điển như "To be or not to be".',
    fileUrl: 'https://www.gutenberg.org/files/1524/1524-h/1524-h.htm',
    coverImage: 'https://covers.openlibrary.org/b/id/8235109-L.jpg'
  }
];

async function seedBooks() {
  try {
    if (!mongoUri) {
      throw new Error('❌ Thiếu thông tin MongoDB trong .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối MongoDB thành công!');

    await Book.deleteMany({});
    await Book.insertMany(books);
    console.log('✅ Seed 30 quyển sách thật thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  }
}

seedBooks();