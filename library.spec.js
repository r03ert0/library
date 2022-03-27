
const chai = require('chai');
const { assert } = chai;
var chaiAsPromised = require("chai-as-promised");
const library = require("./library.js");

chai.use(chaiAsPromised);

// const importBooks = (req, res)
describe("Import books", () => {
    it('should throw an error if the path field is incorrect')
    it('should import books from a list if isbn is given')
    it('should import books from a list if title is given')
    it('should import books from a list if authors are given')    
})

// const queryAllBooks = async (req, res)
describe("Query books", () => {
    it('should return a list with all books', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "books=true"
            }
        }
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await library(req, res);
        assert.equal(key, 'Content-Type');
        assert.equal(val, 'application/json');

        const json = JSON.parse(body);
        assert.isNotNull(json);
    })
})

// const servePDF = (req, res)
describe("Serve books", () => {
    it('should throw an error if the path is incorrect', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "mode=read&path=incorrect_path/to.pdf"
            }
        };
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await assert.isRejected(library(req, res));

    })

    it('should serve a book pdf if the path is correct', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "mode=read&path=/Users/roberto/Desktop/1997martins-hansen%3Bphylogenies_10.2307@2463542.pdf"
            }
        };
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await assert.isFulfilled(library(req, res));

    });

    it('should serve a book pdf if the url is correct', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "mode=read&url=https%3A//mattermost.brainhack.org/vrmedia/Autism/2003Bock-Goode%3BAutism%2520-%2520Neural%2520basis%2520and%2520treatment%2520possibilities%3BBook.pdf"
            }
        };
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await assert.isFulfilled(library(req, res));

    });

    it('should serve a book epub if the url is correct', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "mode=read&url=https%3A//mattermost.brainhack.org/vrmedia/Art/Caroline%20Pessin%20-%20Cook%20When%20You%20Can%2C%20Eat%20When%20You%20Want_%20Prep%20Once%20for%20Delicious%20Meals%20All%20Week-Black%20Dog%20%26%20Leventhal%20%282019%29%3BBook.epub"
            }
        };
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await assert.isFulfilled(library(req, res));

    });

    it('should serve a book djvu if the rul is correct', async () => {
        const req = {
            method: "GET",
            _parsedUrl: {
                query: "mode=read&url=https%3A//mattermost.brainhack.org/vrmedia/Music/The_Csound_Book__Perspectives_in_Software_Synthesis__Sound_Design__Signal_Processing_and_Programming%3BBook.djvu"
            }
        };
        let key, val, body, end;
        const res = {
            statusCode: null,
            setHeader: (a, b) => {key = a; val = b;},
            write: (str) => {body = str;},
            end: () => {end = true;}
        }
        await assert.isFulfilled(library(req, res));

    });
})

// const removeBook = async (req, res);
describe("Remove books", () => {
    it('should correctly remove a book if information is correct')
    it('should throw an error if book information is incorrect')    
})

// const methodGet = (req, res, next);
describe("GET route", () => {
    it('should correctly dispatch GET functions')
})

// const methodPost = async (req, res, next);
describe("POST route", () => {
    it('should correctly dispatch POST functions')
})
