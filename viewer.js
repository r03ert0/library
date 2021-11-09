const viewPDF = (url) => {
  return `/viewer-pdf/web/viewer.html?file=${url}`;
}

const viewDJVU = (url) => {
  return `/viewer-djvu/index.html?file=${url}`;
}

const viewEPUB = (url) => {
  return `/viewer-epub/index.html?file=${url}`;
}

const viewBook = ({path, fromURL, fromWS}) => {
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
  const url = `${location.host}/viewer.html?mode=read&path=${path}`;

  const ext = path.split(".").pop();
  let viewerUrl;
  switch (ext) {
  case "pdf":
    viewerUrl = viewPDF(url);
    break;
  case "djvu":
    viewerUrl = viewDJVU(url);
    break;
  case "epub":
    viewerUrl = viewEPUB(url);
    break;
  default:
    console.log("ERROR. Unknown book format:", ext);
    return;
  }

  viewerUrl = viewerUrl;
  el.src = viewerUrl;
  document.querySelector("body").appendChild(el);

  if (fromWS === true) {
    location.replace(viewerUrl);
    socket.close("Got book:", path);
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
  if(msg.data === "connected") { return; }
  console.log({msg});

  try {
    const data = JSON.parse(msg.data);
    switch(data.type) {
    case "echo":
      console.log(data);
      break;
    case "open":
      viewBook({path: data.path, fromWS: true});
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
    const path = file.split("&").pop().replace("path=","");
    viewBook({path, fromURL: true});

    return true;
  }

  return false;
}

const init = () => {
  // check it there's a book in the URL
  if (initFromURL() === false) {
    // if not, wait for a book to come through websockets
    initSocket();
  }
}

init();