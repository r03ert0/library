let books;

const openBook = (path) => {
  const url = location.href + `index.html?mode=read&path=${path}`;
  location = url;
};

const _displayQueryPanel = (el, title, authors, path) => {
  const queryEl = document.createElement("div");
  queryEl.classList.add("query");
  queryEl.innerHTML = `
  <b>Title</b><br />
  <input id="title" type="text" value="${title}" /><br />
  <b>Authors</b><br />
  <input id="authors" type="text" value="${
    (typeof(authors)==="string")?authors:authors.join(", ")
  }" />
  `;
  const queryButton = document.createElement("button");
  queryButton.innerHTML = "Query"
  queryButton.addEventListener("click", () => {
    const newTitle = queryEl.querySelector("#title").value;
    const newAuthors = queryEl.querySelector("#authors").value;
    el.remove();
    updateBook({title: newTitle, authors: newAuthors, path});
  });
  queryEl.appendChild(queryButton);
  el.appendChild(queryEl);
}

const _displayBookQueryResult = (el, json, path) => {
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
  buttonUpdate.addEventListener("click", async () => {
    const options = document.querySelectorAll('input[name=update]');
    let selectedIndex = -1;
    for(let i = 0; i < options.length; i++){
      if(options[i].checked) {
        selectedIndex = i;
        break;
      }
    }
    if(selectedIndex<0) {
      return;
    }

    console.log("Update entry for path", path);
    console.log("Values:", );
    const item = json.items[selectedIndex];
    const book = {
      path,
      title: item.volumeInfo.title,
      industryIdentifiers: item.volumeInfo.industryIdentifiers,
      authors: item.volumeInfo.authors,
      pageCount: item.volumeInfo.pageCount,
      dimensions: item.volumeInfo.dimensions
    }
    if(item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail) {
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

const updateBook = async ({title, authors, path}) => {
  const el = document.createElement("div");
  el.classList.add("update");
  document.querySelector("body").appendChild(el);

  _displayQueryPanel(el, title, authors, path);

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:"${title}"" inauthor:${authors}&maxResults=40`);
  const json = await res.json(res);
  if (json && json.items) {
    _displayBookQueryResult(el, json, path);
  } else {
    _displayEmptyQueryResult(el);
  }
};

const displayAllBooks = () => {
  for (const [i, book] of books.entries()) {
    const el = document.createElement("div");
    el.classList.add("book");
    if(book.recordIncomplete) {
      el.classList.add("incomplete");
    }
    if(book.thumbnail) {
      el.innerHTML = `<div class="img-div"><img src="${book.thumbnail.replace("http:", "https:")}" /></div>`;
    } else {
      el.innerHTML = `<div class="img-div"></div>`;
    }
    el.innerHTML += `<h2>${i+1}. ${book.title}</h2>`;
    if(book.authors && typeof book.authors === 'object') {
      el.innerHTML += `<p>${book.authors.join(", ")}</p>`;
    }
    if(book.authors && typeof book.authors === 'string') {
      el.innerHTML += `<p>${book.authors}</p>`;
    }
    if(book.path) {
      el.innerHTML += `<p class="path">${book.path}</p>`;
    }

    const openButtonEl = document.createElement("button");
    openButtonEl.innerHTML = "Open";
    openButtonEl.addEventListener("click", () => { openBook(book.path); });
    el.appendChild(openButtonEl);

    const removeButtonEl = document.createElement("button");
    removeButtonEl.innerHTML = "Remove";
    removeButtonEl.addEventListener("click", () => { removeBook(book.path); });
    el.appendChild(removeButtonEl);

    const updateButtonEl = document.createElement("button");
    updateButtonEl.innerHTML = "Update";
    updateButtonEl.addEventListener("click", () => { updateBook(book); });
    el.appendChild(updateButtonEl);

    document.querySelector("body").appendChild(el);
  }
};

const queryAllBooks = async () => {
  const url = location.href + "?books=true";
  console.log("querying", url);
  const res = await fetch(url);
  const result = await res.json();
  books = result.body;
  return books;
}

const init = async () => {
  books = await queryAllBooks();
  displayAllBooks();
}

init();