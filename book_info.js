const axios = require('axios');
const monk = require('monk');
const MONGO_DB = '127.0.0.1:27017/library';
const db = monk(MONGO_DB);

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

const getBookInfoFromDB = async (query) => {
  const info = await new Promise((resolve, reject) => {
    db.get("library").findOne({path: query.path})
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

const addBookToDB = (book) => new Promise((resolve, reject) => {
  db.get("library").insert(book)
    .then(resolve);
});

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
    info.path = query.path;
    addBookToDB(info);

    return info;
  }

  // console.log("Book unavailable: store an incomplete record");
  info = query;
  info.recordIncomplete = true;
  addBookToDB(info);

  return info;
};

const importBooks = async (list) => {
  const allBooksInfo = [];

  for(const [i, book] of list.entries()) {
    console.log(`${i}. Book path: ${book.path}`);
    const info = await getBookInfo(book);
    if (info) {
      allBooksInfo.push(info);
    }
  }

  return allBooksInfo;
};

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

const updateBook = (book) => new Promise((resolve, reject) => {
  if (!book.path) {
    reject(new Error("ERROR: No path provided"));
  }

  const query = {
    path: book.path
  };

  const update = {
    path: book.path,
    title: book.title,
    authors: book.authors,
    industryIdentifiers: book.industryIdentifiers,
    pageCount: book.pageCount,
    dimensions: book.dimensions,
    thumbnail: book.thumbnail
  };

  db.get("library").update(query, update, {replaceOne: true})
    .then(resolve);
});

const removeBook = (book) => new Promise((resolve, reject) => {
  if (!book.path) {
    reject(new Error("ERROR: No path provided"));
  }

  const query = {
    path: book.path
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
