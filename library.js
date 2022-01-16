/* eslint-disable no-sync */
const fs = require('fs');
const bookInfo = require('./book_info.js');
const querystring = require('querystring');
const request = require('request');

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
  console.log("Format: pdf");
  const params = querystring.parse(req._parsedUrl.query);
  const pdf =fs.readFileSync(unescape(params.path));
  var stat = fs.statSync(unescape(params.path));
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/pdf');
  res.write(pdf);
  res.end();
};

const serveDJVU = (req, res) => {
  console.log("Format: djvu");
  const params = querystring.parse(req._parsedUrl.query);
  const djvu =fs.readFileSync(unescape(params.path));
  var stat = fs.statSync(unescape(params.path));
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'image/vnd.djvu');
  res.write(djvu);
  res.end();
};

const serveEPUB = (req, res) => {
  console.log("Format: epub");
  const params = querystring.parse(req._parsedUrl.query);
  const epub =fs.readFileSync(unescape(params.path));
  var stat = fs.statSync(unescape(params.path));
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/epub+zip');
  res.write(epub);
  res.end();
};

const serveBook = (req, res) => {
  console.log("Serving book");
  const params = querystring.parse(req._parsedUrl.query);
  console.log(req._parsedUrl.query);
  console.log(params);
  const ext = params.path.split(".").pop();
  switch (ext) {
    case "pdf":
      servePDF(req, res);
      break;
    case "djvu":
      serveDJVU(req, res);
      break;
    case "epub":
      serveEPUB(req, res);
      break;
    default:
      console.log("ERROR. Unknown book format:", ext);
  }
  res.end();
};

const serveImage = (req, res) => {
  const params = querystring.parse(req._parsedUrl.query);
  const url = unescape(params.path);
  request.get(url).pipe(res);
}
const removeBook = async (req, res) => {
  console.log("removeBook");
  const params = querystring.parse(req._parsedUrl.query);
  const result = await bookInfo.removeBook({path: params.path});
  console.log(`  ${params.path}`);
  const resBody = { body: result };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(resBody));
  res.end();
};

const methodGet = (req, res, next) => {
  console.log("methodGet");
  const params = querystring.parse(req._parsedUrl.query);
  console.log(params.books, params.mode, req._parsedUrl.query);
  if (params.books) {
    queryAllBooks(req, res);
  } else if (params.mode && params.mode === "read") {
    serveBook(req, res);
  } else if (params.mode && params.mode === "remove") {
    removeBook(req, res);
  } else if (params.mode && params.mode === "image") {
    serveImage(req, res);
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
