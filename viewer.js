// viewer.js
// client-side code

let bookInfo;

const setBookmarkPDF = () => {
  const currentPageNumber = document.querySelector("iframe").contentWindow.PDFViewerApplication.pdfViewer.currentPageNumber;
  alert(`Bookmark page ${currentPageNumber}`);
  socket.send(`bookmark ${bookInfo.data._id} ${currentPageNumber}`);
  return currentPageNumber;
}

const setBookmarkDJVU = () => {
  const pageNumber = document.querySelector("iframe").contentWindow.ViewerInstance.getPageNumber();
  alert(`Bookmark page ${pageNumber}`);
  socket.send(`bookmark ${bookInfo.data._id} ${pageNumber}`);
  return pageNumber;
}

const setBookmarkEPUB = () => {
  const location = document.querySelector("iframe").contentWindow.book.rendition.currentLocation();
  const page = location.start.cfi;
  socket.send(`bookmark ${bookInfo.data._id} ${page}`);
  return page;
}

const setBookmark = () => {
  let pathOrUrl;
  if (bookInfo.data.path) {
    pathOrUrl = bookInfo.data.path;
  } else if (bookInfo.data.url) {
    pathOrUrl = bookInfo.data.url;
  } else {
    console.log("WARNING: check how we got here");
    return;
  }

  const ext = pathOrUrl.split(".").pop();
  let page;
  switch(ext) {
    case "pdf":
      page = setBookmarkPDF();
      break;
    case "djvu":
      page = setBookmarkDJVU();
      break;
    case "epub":
      page = setBookmarkEPUB();
      break;
  }

  bookInfo.data.bookmark = page;
  document.querySelector("#goToBookmark").innerHTML = `Go to bookmark (p. ${page})`;
}

const goToBookmarkPDF = () => {
  const PDFViewerApplication = document.querySelector("iframe").contentWindow.PDFViewerApplication;
  PDFViewerApplication.pdfViewer.currentPageNumber = Number(bookInfo.data.bookmark);
}

const goToBookmarkDJVU = () => {
  document.querySelector("iframe").contentWindow.ViewerInstance.configure({
    pageNumber: Number(bookInfo.data.bookmark)
  });
};

const goToBookmarkEPUB = () => {
  document.querySelector("iframe").contentWindow.book.rendition.display(bookInfo.data.bookmark);
};

const goToBookmark = () => {
  if (typeof bookInfo.data.bookmark === "undefined") {
    alert("There is no bookmark");
    return;
  }

  let pathOrUrl;
  if (bookInfo.data.path) {
    pathOrUrl = bookInfo.data.path;
  } else if (bookInfo.data.url) {
    pathOrUrl = bookInfo.data.url;
  } else {
    console.log("WARNING: check how we got here");
    return;
  }
  const ext = pathOrUrl.split(".").pop();
  switch(ext) {
    case "pdf":
      goToBookmarkPDF();
      break;
    case "djvu":
      goToBookmarkDJVU();
      break;
    case "epub":
      goToBookmarkEPUB();
      break;
  }
};

const notes = () => {

};

const viewPDF = (url) => {
  return `/viewer-pdf/web/viewer.html?file=${url}`;
}

const viewDJVU = (url) => {
  return `/viewer-djvu/index.html?file=${url}`;
}

const viewEPUB = (url) => {
  return `/viewer-epub/index.html?file=${url}`;
}

const viewBook = ({path, url, fromWS}) => {
  // remove "waiting" message
  document.querySelector("#waiting").remove();

  // remove existing viewer, if any
  let el = document.querySelector("#viewer");
  if (el) {
    el.remove();
  }

  // add new viewer
  el = document.createElement("iframe");
  el.id = "viewer";
  el.width = "100%";
  el.height = "100%";
  let bookUrl;

  if(path) {
    bookUrl = `${location.host}/viewer.html?mode=read&path=${path}`;
  } else if (url) {
    bookUrl = `${location.host}/viewer.html?mode=read&url=${url}`;
  }

  // bookUrl = location.href + `?mode=read&path=${escape(path)}`;
  // const viewerUrl = `/viewer.html?file=${bookUrl}`;
  // window.open(viewerUrl, '_blank');

  const ext = bookUrl.split(".").pop();
  let viewerUrl;
  switch (ext) {
  case "pdf":
    // viewerUrl = `/viewer.html?file=${bookUrl}`;// viewPDF(bookUrl);
    viewerUrl = viewPDF(bookUrl);
    break;
  case "djvu":
    viewerUrl = viewDJVU(bookUrl);
    break;
  case "epub":
    viewerUrl = viewEPUB(bookUrl);
    break;
  default:
    console.log("ERROR. Unknown book format:", ext);
    return;
  }

  el.src = viewerUrl;
  document.querySelector("#content").appendChild(el);

  document.querySelector("#tools").style.display = "block";

  if (fromWS === true) {
    location.replace(viewerUrl);
    socket.close("Got book:", path, url);
  }
};

let socket = null;
const liveServerSocket = async () => {
  const delay = 1000;
  const timeout = 10000;
  const now = new Date();
  const ws = await new Promise((resolve, reject) => {
    const check = () => {
      if(new Date() - now > timeout) {
        reject(new Error("timeout"));
      }

      if(typeof window.LiveServerWebsocket !== "undefined") {
        resolve(window.LiveServerWebsocket);
      }
      setTimeout(check, delay);
    };
    check();
  });

  return ws;
};

const onSocketMessage = (msg) => {
  if(msg.data === "connected") {
    return;
  }
  console.log({msg});

  try {
    const data = JSON.parse(msg.data);
    switch(data.type) {
    case "echo":
      console.log(data);
      break;
    case "open":
      // if (bookFromURL === false) {
      //   viewBook({
      //     path: data.path,
      //     url: data.url,
      //     fromWS: true});
      // }
      bookUrl = location.href + `?mode=read&url=${escape(data.url)}`;
      const viewerUrl = `/viewer.html?file=${bookUrl}`;
      location = viewerUrl;

      break;
    case "info":
      if (data.data === null) {
        return;
      }
      bookInfo = data;
      console.log("Got book info:");
      console.log(bookInfo);
      document.querySelector("#goToBookmark").innerHTML = `Go to bookmark (p. ${bookInfo.data.bookmark})`;
      break;
    default:
      console.log("Unknown message:", data);
    }
  } catch(err) {
    console.log("socket message:", msg.data);
    throw new Error(err);
  }
};

const initSocket = async () => {
  try {
    socket = await liveServerSocket();
  } catch(err) {
    throw new Error(err);
  }
  console.log("Got socket", socket);
  socket.send(`echo ${JSON.stringify({msg: "Got socket"})}`);

  if (bookFromURL === true) {
    // const url = "https://mattermost.brainhack.org/vrmedia/Autism/2003Bock-Goode;Autism - Neural basis and treatment possibilities;Book.pdf";
    if (bookInfo.data.path) {
      socket.send(`info path ${bookInfo.data.path}`);
    } else if (bookInfo.data.url) {
      socket.send(`info url ${bookInfo.data.url}`);
    } else {
      console.log("WARNING: check what happened...");
    }
  }

  const originalOnmessageFn = socket.onmessage;
  socket.onmessage = (msg) => {
    originalOnmessageFn(msg);
    onSocketMessage(msg);
  };
};

const initFromURL = () => {
  let file;
  const queryString = document.location.search.substring(1);
  file = queryString.replace("file=", "");
  if (file) {
    if(file.match("&path=")) {
      const path = file.split("&").pop().replace("path=","");
      bookInfo = {data:{path: unescape(path)}};
      viewBook({path, fromURL: true});
    } else if (file.match("&url=")) {
      const url = file.split("&").pop().replace("url=","");
      bookInfo = {data:{url: unescape(url)}};
      viewBook({url, fromURL: true});
    }

    return true;
  }

  return false;
}

let bookFromURL = false;

const init = () => {
  // check it there's a book in the URL
  bookFromURL = initFromURL();

  initSocket();
}

init();