// list.js
// client-side code

let books;
let bookcaseEl;

const openBook = (path, url) => {
    let bookUrl;
    if (path) {
        bookUrl = location.href + `?mode=read&path=${escape(path)}`;
        const viewerUrl = `/viewer.html?file=${bookUrl}`;
        window.open(viewerUrl, '_blank');
    }
    if (url) {
        bookUrl = location.href + `?mode=read&url=${escape(url)}`;
        const viewerUrl = `/viewer.html?file=${bookUrl}`;
        window.open(viewerUrl, '_blank');
    }
};

const _displayQueryPanel = (el, title, authors, path, url) => {
    const queryEl = document.createElement("div");
    queryEl.classList.add("query");
    queryEl.innerHTML = `
  <b>Path</b><br />
  <span>${path}</span><br />
  <b>URL</b><br />
  <span>${url}</span><br />
  <b>Title</b><br />
  <input id="title" type="text" value="${title}" /><br />
  <b>Authors</b><br />
  <input id="authors" type="text" value="${
  (typeof (authors)==="string")?authors:authors.join(", ")
}" />
  `;
    const queryButton = document.createElement("button");
    queryButton.innerHTML = "Query";
    queryButton.addEventListener("click", () => {
        const newTitle = queryEl.querySelector("#title").value;
        const newAuthors = queryEl.querySelector("#authors").value;
        el.remove();
        updateBook({ title: newTitle, authors: newAuthors, path, url });
    });
    queryEl.appendChild(queryButton);
    el.appendChild(queryEl);
};

const _displayBookQueryResult = (el, json, path, url) => {
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("content");
    el.appendChild(contentDiv);

    for (const [i, item] of json.items.entries()) {
        // industryIdentifiers: item.volumeInfo.industryIdentifiers,
        contentDiv.innerHTML += `
      <div style="border: thin solid grey;margin:10px;padding:10px;background:white">
        <input type="radio" name="update" value="${i}"/>
        <label for="${i}">
          <img style="vertical-align: top; border: thin solid grey" src="${item.volumeInfo.imageLinks?item.volumeInfo.imageLinks.thumbnail:""}" />
          <div style="display:inline-block">
            <b>${item.volumeInfo.title}.</b><br />
            ${item.volumeInfo.authors}<br />
            (${item.volumeInfo.pageCount} pages)
          </div>
        </label>
      </div>
    `;
    }
    contentDiv.querySelector("input[name=update").checked = true;

    const buttonUpdate = document.createElement("button");
    buttonUpdate.innerHTML = "Update";
    buttonUpdate.addEventListener("click", async() => {
        const options = document.querySelectorAll('input[name=update]');
        let selectedIndex = -1;
        for (let i = 0; i < options.length; i++) {
            if (options[i].checked) {
                selectedIndex = i;
                break;
            }
        }
        if (selectedIndex < 0) {
            return;
        }

        const item = json.items[selectedIndex];
        const book = {
            path,
            url,
            title: item.volumeInfo.title,
            industryIdentifiers: item.volumeInfo.industryIdentifiers,
            authors: item.volumeInfo.authors,
            pageCount: item.volumeInfo.pageCount,
            dimensions: item.volumeInfo.dimensions
        };
        if (item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail) {
            book.thumbnail = item.volumeInfo.imageLinks.thumbnail;
        }
        const res = await fetch(location.href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(book)
        });

        el.remove();
    });
    el.appendChild(buttonUpdate);

    const buttonCancel = document.createElement("button");
    buttonCancel.innerHTML = "Cancel";
    buttonCancel.addEventListener("click", () => {
        document.querySelector("body").removeChild(el);
    });
    el.appendChild(buttonCancel);
};

const _displayEmptyQueryResult = (el) => {
    const buttonCancel = document.createElement("button");
    buttonCancel.innerHTML = "Cancel";
    buttonCancel.addEventListener("click", () => {
        document.querySelector("body").removeChild(el);
    });
    el.appendChild(buttonCancel);
};

const removeBook = async({ path, url }) => {
    // eslint-disable-next-line no-alert
    let answer;
    if (path) {
        answer = confirm(`Confirm removal of ${path}`);
    } else if (url) {
        answer = confirm(`Confirm removal of ${url}`);
    }
    if (!answer) {
        return;
    }

    let fetchUrl;
    if (path) {
        fetchUrl = location.protocol + "//" + location.host + location.pathname + `?mode=remove&path=${escape(path)}`;
    } else if (url) {
        fetchUrl = location.protocol + "//" + location.host + location.pathname + `?mode=remove&url=${escape(url)}`;
    }
    const res = await fetch(fetchUrl);
    console.log(res);
};

const importBook = () => {
    const pathOrUrl = prompt("Enter book path or url");
    if (!pathOrUrl) {
        return;
    }

    const isUrl = (pathOrUrl.split(":")[0].slice(0, 4) === "http");

    if (isUrl) {
        updateBook({
            title: "",
            authors: "",
            url: pathOrUrl
        });
    } else {
        updateBook({
            title: "",
            authors: "",
            path: pathOrUrl
        });
    }
};


const updateBook = async({ title, authors, path, url }) => {
    const el = document.createElement("div");
    el.classList.add("update");
    document.querySelector("body").appendChild(el);

    _displayQueryPanel(el, title, authors, path, url);

    let queryString = "https://www.googleapis.com/books/v1/volumes?maxResults=40&q=";
    if (title) {
        queryString += ` intitle:"${title}"`;
    }
    if (authors) {
        queryString += ` inauthor:${authors}`;
    }
    console.log(queryString);
    const res = await fetch(queryString);
    const json = await res.json(res);
    if (json && json.items) {
        _displayBookQueryResult(el, json, path, url);
    } else {
        _displayEmptyQueryResult(el);
    }
};

const _addButton = (el, name, fn) => {
    const button = document.createElement("button");
    button.innerHTML = name;
    button.addEventListener("click", fn);
    el.appendChild(button);
};

const _addFindInputField = (el, name, fn) => {
    const span = document.createElement("span");
    span.innerHTML = "<b>Find</b>";
    el.appendChild(span);

    const input = document.createElement("input");
    input.innerHTML = name;
    input.addEventListener("keydown", fn);
    el.appendChild(input);
};

const _filter = (bookArray, filter) => {
    filter = filter.toLowerCase();
    bookArray = bookArray.filter((o) => {
        const isInTitle = o.title.toLowerCase().search(filter) > -1;
        const authors = o.authors ? ((typeof o.authors === 'object') ? o.authors.join(" ") : o.authors) : "";
        const isInAuthors = authors.toLowerCase().search(filter) > -1;
        return isInTitle || isInAuthors;
    });
    return bookArray;
};

const displayBooks = (order, filter) => {
    let orderedBooks = [...books];

    if (filter) {
        orderedBooks = _filter(orderedBooks, filter);
    }

    if (order === "title") {
        orderedBooks.sort((a, b) => (a.title > b.title) ? 1 : ((a.title < b.title) ? -1 : 0));
    } else if (order === "authors") {
        orderedBooks.sort((a, b) => {
            const authorsA = a.authors ? ((typeof a.authors === 'object') ? a.authors.join(", ") : a.authors) : "";
            const authorsB = b.authors ? ((typeof b.authors === 'object') ? b.authors.join(", ") : b.authors) : "";
            return (authorsA > authorsB) ? 1 : ((authorsA < authorsB) ? -1 : 0);
        });
    }

    bookcaseEl.innerHTML = "";

    for (const [i, book] of orderedBooks.entries()) {
        const el = document.createElement("div");
        el.classList.add("book");

        if (book.recordIncomplete) {
            el.classList.add("incomplete");
        }

        el.innerHTML = book.thumbnail ?
            `<div class="img-div"><img src="${book.thumbnail.replace("http:", "https:")}" /></div>` :
            `<div class="img-div"></div>`;

        el.innerHTML += `<h2>${i+1}. ${book.title}</h2>`;

        if (book.authors) {
            el.innerHTML += (typeof book.authors === 'object') ?
                `<p>${book.authors.join(", ")}</p>` :
                `<p>${book.authors}</p>`;
        }

        if (book.path) {
            el.innerHTML += `<p class="path">Path: ${book.path}</p>`;
        }

        if (book.url) {
            el.innerHTML += `<p class="path">URL: ${book.url}</p>`;
        }

        _addButton(el, "Open", () => { openBook(book.path, book.url); });
        _addButton(el, "Remove", () => { removeBook(book); });
        _addButton(el, "Update", () => { updateBook(book); });

        bookcaseEl.appendChild(el);
    }
};

const queryAllBooks = async() => {
    const params = document.location.search.substring(1);
    const url = location.host + "?" + [params, "books=true"].join("&");
    const res = await fetch(url);
    const result = await res.json();
    books = result.body;

    return books;
};

const sortBy = (order) => {
    const url = location.protocol + "//" + location.host + location.pathname + `?order=${order}`;
    location = url;
}

const find = (e) => {
    const filter = e.target.value;
    displayBooks(order, filter);
};

const makeToolbar = () => {
    const el = document.createElement("div");
    el.classList.add("toolbar");
    _addButton(el, "Import Book", () => { importBook(); });
    _addButton(el, "Sort by Title", () => { sortBy("title"); });
    _addButton(el, "Sort by Authors", () => { sortBy("authors"); });
    _addFindInputField(el, "Find", (event) => { find(event); });
    document.querySelector("body").appendChild(el);

    return el;
};

const makeBookcase = () => {
    const el = document.createElement("div");
    document.querySelector("body").appendChild(el);

    return el;
};

const init = async(order) => {
    books = await queryAllBooks();
    const toolbarEl = makeToolbar();
    bookcaseEl = makeBookcase();
    displayBooks(order);
};