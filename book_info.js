const axios = require('axios');
const monk = require('monk');
const MONGO_DB = '127.0.0.1:27017/library';
const db = monk(MONGO_DB);

/**
 * Parse data from Google Books API
 * @param {object} data Data from Google Books API
 * @returns {object} Book data
 */
const parseData = (data) => {
  let parsedData;

  for (const item of data) {
    if (item.volumeInfo) {
      // console.log(item.volumeInfo);
      parsedData = {
        title: item.volumeInfo.title,
        industryIdentifiers: item.volumeInfo.industryIdentifiers,
        authors: item.volumeInfo.authors,
        pageCount: item.volumeInfo.pageCount,
        dimensions: item.volumeInfo.dimensions
      };
      if (item.volumeInfo.imageLinks) {
        parsedData.thumbnail = item.volumeInfo.imageLinks.thumbnail;
      }
      break;
    }
  }

  return parsedData;
};

/**
 * Get book information from the database
 * @param {object} query Object with `path` property containing the
 * path to the book pdf in the local file system
 * @returns {object} The book entry in the database
 */
const getBookInfoFromDB = async (query) => {
  const info = await new Promise((resolve, reject) => {
    db.get("library").findOne({path: unescape(query.path)})
      .then((res) => {
        resolve(res);
      });
  });

  return info;

  /*
  if (query.isbn) {
    info = await new Promise((resolve, reject) => {
      db.get("library").findOne({industryIdentifiers: {
        $elemMatch: {
          identifier: `${query.isbn}`
        }
      }}).then((res)=> {
        resolve(res);
      });
    });
  } else if (query.title) {
    info = await new Promise((resolve, reject) => {
      db.get("library").findOne({title: {
        $regex: new RegExp(query.title, "i")
      }}).then((res) => {
        resolve(res);
      });
    });
  }
  */
};

/**
 * Get book information from Google Books. Used when batch importing books.
 * @param {object} query Query book info from Google Books using isbn or title.
 * @returns {void}
 */
const getBookInfoFromGoogle = async (query) => {
  console.log("  Querying Google Books API");

  let info;
  if (query.isbn) {
    console.log("  Query ISBN", query.isbn);
    info = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${query.isbn}`);
  } else if (query.title) {
    console.log("  Query Title", query.title);
    try {
      info = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:"${query.title}"`);
    } catch (err) {
      console.log(err);
    }
  }

  if (info.data && info.data.items) {
    return parseData(info.data.items);
  }
  console.log("  No data for", query);

};

/**
 * Add book entry to database
 * @param {object} book Book data
 * @returns {void}
 */
const addBookToDB = (book) => new Promise((resolve, reject) => {
  db.get("library").insert(book)
    .then(resolve);
});

/**
 * Get information for a book, either from the local database or from Google Books.
 * Book data obtained from Google Books is added to the local database, creating
 * a new entry. If the information is unavailable, an incomplete record is created.
 * @param {object} query Query object containing the book's path in the local
 * filesystem, or title or author fields which can be used to query Google Books
 * @returns {object} The book entry in the database
 */
const getBookInfo = async (query) => {
  if(typeof query.path === "undefined") {
    // console.log("ERROR: Query does not contain path to book's pdf", query);

    return;
  }

  // if info is available in the db, get it from there
  let info;
  info = await getBookInfoFromDB(query);
  if (info) {
    // console.log("  Found in local DB");

    return info;
  }

  // else, query google books
  info = await getBookInfoFromGoogle(query);
  if (info) {
    // console.log("Book found in Google Books: adding.");
    info.path = unescape(query.path);
    addBookToDB(info);

    return info;
  }

  // console.log("Book unavailable: store an incomplete record");
  info = query;
  info.recordIncomplete = true;
  addBookToDB(info);

  return info;
};

/**
 * 
 * @param {array} list List of books to add. Each entry should contain a path,
 * and can also contain title, authors or isbn.
 * @returns {array} Updated book information containing the fields provided by
 * Google Books
 */
const importBooks = async (list) => {
  const allBooksInfo = [];

  for(const [i, book] of list.entries()) {
    console.log(`${i}. Book path: ${unescape(book.path)}`);
    const info = await getBookInfo(book);
    if (info) {
      allBooksInfo.push(info);
    }
  }

  return allBooksInfo;
};

/**
 * @returns {array} List of all books in the database
 */
const queryAllBooks = async () => {
  const books = await new Promise((resolve, reject) => {
    db.get("library").find()
      .then((res) => { resolve(res); });
  });

  for (const book of books) {
    delete book._id;
  }

  return books;
};

/**
 * Update data for book at path
 * @param {object} book New book data, should contain all fields.
 * @returns {void}
 */
const updateBook = (book) => new Promise((resolve, reject) => {
  if (!book.path) {
    reject(new Error("ERROR: No path provided"));
  }

  const query = {
    path: unescape(book.path)
  };

  const update = {
    path: unescape(book.path),
    title: book.title,
    authors: book.authors,
    industryIdentifiers: book.industryIdentifiers,
    pageCount: book.pageCount,
    dimensions: book.dimensions,
    thumbnail: book.thumbnail
  };

  console.log("update");
  console.log(query);
  console.log(update);

  db.get("library").update(query, update, {upsert: true, replaceOne: true})
    .then(resolve);
});

/**
 * Remove book at path from database
 * @param {object} book Book data including the path field
 * @returns {void}
 */
const removeBook = (book) => new Promise((resolve, reject) => {
  if (!book.path) {
    reject(new Error("ERROR: No path provided"));
  }

  const query = {
    path: unescape(book.path)
  };

  db.get("library").remove(query)
    .then((res) => {
      console.log("remove", res);
      resolve(res);
    });
});

module.exports = {
  importBooks,
  queryAllBooks,
  updateBook,
  removeBook
};
