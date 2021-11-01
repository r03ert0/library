/* eslint-disable no-sync */
const fs = require('fs');
const bookInfo = require('./book_info.js');
const querystring = require('querystring');

const importBooks = (req, res) => {
  // const booksCSV = fs.readFileSync('my_book_titles.tsv').toString();
  // const books = booksCSV.split("\n").map((row)=> {
  //   const [path, authors, title] = row.split("\t");
  //   return { path, authors, title: title.trim() };
  // });
};

const queryAllBooks = async (req, res) => {
  const { headers, method, url } = req;
  const result = await bookInfo.queryAllBooks();
  const resBody = { headers, method, url, body: result };
  // return resBody;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(resBody));
  res.end();
};

const servePDF = (req, res) => {
  console.log("Serving pdf");
  const params = querystring.parse(req._parsedUrl.query);
  const pdf =fs.readFileSync(params.path);
  var stat = fs.statSync(params.path);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/pdf');
  res.write(pdf);
  res.end();
};

const removeBook = async (req, res) => {
  const params = querystring.parse(req._parsedUrl.query);
  const result = await bookInfo.removeBook({path: params.path});
  const resBody = { body: result };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(resBody));
  res.end();
};

const methodGet = (req, res, next) => {
  const params = querystring.parse(req._parsedUrl.query);
  if (params.books) {
    queryAllBooks(req, res);
  } else if (params.mode && params.mode === "read") {
    servePDF(req, res);
  } else if (params.mode && params.mode === "remove") {
    removeBook(req, res);
  } else {
    return next();
  }
};

const methodPost = async (req, res, next) => {
  const data = [];
  req.on('data', (chunk) => {
    data.push(chunk);
  });
  req.on('end', async () => {
    var buffer = Buffer.concat(data);
    try {
      const book = JSON.parse(buffer);
      const result = await bookInfo.updateBook(book);
      console.log(result);
    } catch(err) {
      console.log(err);
    }
  });

  next();
};

module.exports = async (req, res, next) => {
  if (req.method === "GET") {
    methodGet(req, res, next);
  } else if (req.method === "POST") {
    methodPost(req, res, next);
  } else {
    return next();
  }
};
