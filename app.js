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

// eslint-disable-next-line max-statements
const wsmessage = (uid, event) => {
  const msg = event.data;
  const parts = msg.split(" ");
  const [key] = parts; // gets 1st element only
  const val = parts.slice(1).join(" ");

  console.log("received message:", key);

  switch(key) {
  case "echo":
    console.log("VR>", msg);
    break;
  case "greet":
    clients[uid].ws.send("Greetings for the day");
    break;
  case "monk": {
    const [, callbackId, fn, ...rest] = parts;
    console.log("callbackId:", callbackId);
    console.log("func:", fn);
    const args = rest?JSON.parse(rest.join(" ")):[];
    console.log("args:", args);
    const collection = db.get("bookmarks");
    collection[fn](...args).then((content) => {
      clients[uid].ws.send(JSON.stringify({
        type: "bookmark",
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

const params = {
  port: 8080,
  ignorePattern: /.*\.git.*/,
  wait: 500,
  cors: true,
  setws: (client) => {
    (function (ws, uid) {
      clients[uid] = {
        ws,
        homedir
      };
      ws.onmessage = (msg) => { wsmessage(uid, msg); };
      console.log("new websocket client added in app.js");
    }(client, getUId()));
  },
  middleware: [library],
  https: "./https.conf.js"
};
liveServer.start(params);
console.log("rolling on own live-server");
