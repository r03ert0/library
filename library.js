// library.js
// server-side code

/* eslint-disable no-sync */
const fs = require('fs');
const bookInfo = require('./book_info.js');
const querystring = require('querystring');
const request = require('request');
const bent = require('bent');
const getBuffer = bent('buffer');

const importBooks = (req, res) => {
  // const booksCSV = fs.readFileSync('my_book_titles.tsv').toString();
  // const books = booksCSV.split("\n").map((row)=> {
  //   const [path, authors, title] = row.split("\t");
  //   return { path, authors, title: title.trim() };
  // });
};

const queryAllBooks = async (req, res) => {
  console.log("queryAllBooks");
  const { headers, method, url } = req;
  const result = await bookInfo.queryAllBooks();
  const resBody = { headers, method, url, body: result };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(resBody));
  res.end();
};

const getBookData = async (query) => {
  const params = querystring.parse(query);
  let data, stat;

  if(params.path) {
    try {
      data = fs.readFileSync(unescape(params.path));
      stat = fs.statSync(unescape(params.path));
    } catch(err) {
      throw new Error(err);
    }
  }

  if(params.url) {
    try {
      const url = unescape(params.url);
      data = await getBuffer(url);
      stat = {size: data.length};
    } catch(err) {
      throw new Error(err);
    }
  }

  return {data, stat};
};

const servePDF = async (req, res) => {
  console.log("Format: pdf");
  try {
    const {data, stat} = await getBookData(req._parsedUrl.query);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/pdf');
    res.write(data);
    res.end();
  } catch(err) {
    throw new Error(err);
  }
};

const serveDJVU = async (req, res) => {
  console.log("Format: djvu");
  const {data, stat} = await getBookData(req._parsedUrl.query);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'image/vnd.djvu');
  res.write(data);
  res.end();
};

const serveEPUB = async (req, res) => {
  console.log("Format: epub");
  const {data, stat} = await getBookData(req._parsedUrl.query);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/epub+zip');
  res.write(data);
  res.end();
};

const serveBook = async (req, res) => {
  console.log("Serving book");
  const params = querystring.parse(req._parsedUrl.query);
  console.log(req._parsedUrl.query);
  console.log(params);

  let ext;
  if (params.path) {
    ext = params.path.split(".").pop();
  }
  if (params.url) {
    ext = params.url.split(".").pop();
  }

  switch (ext) {
    case "pdf":
      try {
        await servePDF(req, res);
      } catch(err) {
        throw new Error(err);
      }
      break;
    case "djvu":
      await serveDJVU(req, res);
      break;
    case "epub":
      await serveEPUB(req, res);
      break;
    default:
      throw new Error(`ERROR. Unknown book format: ${ext}`);
  }
  res.end();
};

const serveImage = async (req, res) => {
  const params = querystring.parse(req._parsedUrl.query);
  const url = unescape(params.path);
  request.get(url).pipe(res);
}
const removeBook = async (req, res) => {
  console.log("removeBook");
  const params = querystring.parse(req._parsedUrl.query);
  const result = await bookInfo.removeBook({path: params.path, url: params.url});
  console.log(`  ${params.path} | ${params.url}`);
  const resBody = { body: result };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(resBody));
  res.end();
};

const methodGet = async (req, res, next) => {
  const params = querystring.parse(req._parsedUrl.query);
  if (params.books) {
    await queryAllBooks(req, res);
  } else if (params.mode && params.mode === "read") {
    try {
      await serveBook(req, res);
    } catch(err) {
      throw new Error(err);
    }
  } else if (params.mode && params.mode === "remove") {
    await removeBook(req, res);
  } else if (params.mode && params.mode === "image") {
    await serveImage(req, res);
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
    try {
      await methodGet(req, res, next);
    } catch(err) {
      throw new Error(err);
    }
  } else if (req.method === "POST") {
    methodPost(req, res, next);
  } else {
    return next();
  }
};
