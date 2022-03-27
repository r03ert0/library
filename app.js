// app.js
// server-side code

/* eslint-disable no-sync */
const liveServer = require("live-server");
const library = require("./library.js");
const clients = [];
const path = require("path");
const os = require('os');
const homedir = path.join(os.homedir(), "/");
const monk = require('monk');
const MONGO_DB = '127.0.0.1:27017/library';
const db = monk(MONGO_DB);

console.log({homedir});

const getUId = () => {
  const uid = Math.random().toString(16)
    .slice(2, 8);

  return uid;
};

/**
 * Websocket interaction
 */

const broadcast = (msg) => {
  console.log("broadcast message:", msg);
  for(const uid in clients) {
    console.log("broadcast to uid:", uid)
    if (clients.hasOwnProperty(uid)) {
      clients[uid].ws.send(msg);
    }
  }
}

// eslint-disable-next-line max-statements
const wsmessage = (uid, event) => {
  const msg = event.data;
  const parts = msg.split(" ");
  const [key] = parts; // gets 1st element only

  console.log("received message:", key);

  switch(key) {
  case "echo":
    console.log("VR>", msg);
    break;
  case "greet":
    clients[uid].ws.send("Greetings for the day");
    break;
  case "open":
    broadcast(parts[1]);
    break;
  case "info":
    if(parts[1] === "url") {
      const url = unescape(parts.slice(2).join(" "));
      console.log({url});
      db.get("library").findOne({url})
      .then((result) => {
        clients[uid].ws.send(JSON.stringify({type: "info", data: result}));
      })
    } else if(parts[1] === "path") {
      const path = parts.slice(2).join(" ");
      console.log(path);
      db.get("library").findOne({path})
      .then((result) => {
        clients[uid].ws.send(JSON.stringify({type: "info", data: result}));
      })
    }
    break;
  case "bookmark":
    const _id = parts[1];
    const page = parts[2];
    console.log("Bookmark", _id, page);
    db.get("library").update({_id}, {$set: {bookmark: page}});
    break;
  case "monk": {
    const [, callbackId, fn, ...rest] = parts;
    console.log("callbackId:", callbackId);
    console.log("func:", fn);
    const args = rest?JSON.parse(rest.join(" ")):[];
    console.log("args:", args);
    const collection = db.get("library");
    collection[fn](...args).then((content) => {
      clients[uid].ws.send(JSON.stringify({
        type: "book",
        callbackId,
        content
      }));
    });
    break;
  }
  default:
    console.log("Unknown message", msg);
  }
};

let originalOnopenFn;
let originalOncloseFn;
const params = {
  port: 8080,
  ignorePattern: /.*\.git.*/,
  wait: 500,
  cors: true,
  setws: (client) => {
    (function (ws, uid) {
      console.log("new user:", uid);
      clients[uid] = { ws, homedir };
      originalOnmessageFn = ws.onmessage;
      originalOnopenFn = ws.onopen;
      originalOncloseFn = ws.onclose;
      ws.onmessage = (msg) => {
        wsmessage(uid, msg);
      };
      ws.onopen = (e) => {
        console.log(">> onopen", uid);
        originalOnopenFn();
      }
      ws.onclose = (e) => {
        console.log(">> onclose", uid);
        delete clients[uid];
        originalOncloseFn();
      }
      console.log("new websocket client added in app.js");
    }(client, getUId()));
  },
  middleware: [library],
  https: "./https.conf.js"
};
liveServer.start(params);
console.log("rolling on own live-server");
