/* globals cameraRig */

/*
Implements:
init
getIntersection
intersectionStart
intersectionEnd

Called from:
initThree
handleRightHandSqueezeStart
handleRightHandSqueezeEnd
rightHandSelectStartFunctions
*/

import {
  CanvasTexture, DoubleSide, Group, Matrix4, Mesh,
  MeshBasicMaterial, PlaneBufferGeometry,
  Raycaster, BoxBufferGeometry, Vector3, TextureLoader
} from './node_modules/three/build/three.module.js';

const loader = new TextureLoader();
// loader.crossOrigin = '';
console.log(loader.crossOrigin);

export let booksGroup;
let initialized = false;
const tempVector3 = new Vector3();
const tempMatrix = new Matrix4();
const raycaster = new Raycaster();
export let selectedBook = null;

let ws = null;
const callStack = [];

const randomString = () => Math.random().toString(16)
  .slice(2);

const monk = (fn, args) => new Promise((resolve) => {
  const callbackId = randomString();
  callStack[callbackId] = resolve;
  ws.send(`monk ${callbackId} ${fn} ${JSON.stringify(args)}`);
});

const websocketMessage = (msg) => {
  console.log({msg});
  if(msg.data === "connected" || msg.date === "reload") {
    return;
  }

  const data = JSON.parse(msg.data);
  if (data.type !== "book") {
    return;
  }
  const {content, callbackId} = data;
  callStack[callbackId](content);
  delete callStack[callbackId];
};

export const getWS = () => ws;

export const setWS = (newWS) => {
  ws = newWS;
  ws.onmessage = websocketMessage;
};

export const add = (bm) => monk("insert", [bm]);

export const remove = (id) => monk("remove", [{_id: id}]);

export const findById = (id) => monk("findOne", [{_id: id}]);

export const updateDB = async (id, data) => {
  const res = await findById(id);
  delete res._id;
  for(const key in data) {
    // if (typeof res[key] !== "undefined") {
    res[key] = data[key];
    // }
  }

  return monk("update", [{_id: id}, {$set: res}]);
};

export const books = () => monk("find", []);

export const openBook = ({title, path}) => {
  console.log("open book:", title);
  ws.send(`open ${JSON.stringify({type: "open", path: escape(path)})}`);
};
window.openBook = openBook;

export const displayBook = ({id, path, title, thumbnail, position, rotation, color}) => {
  const geometry = new BoxBufferGeometry(0.15, 0.2, 0.05);
  color = "#" + (Math.random() * 0xfffff * 1e6).toString(16).slice(0, 6);
  // const material = new MeshBasicMaterial({color});
  let material;
  if (thumbnail) {
    const imgUrl = `${location.href}?mode=image&path=${escape(thumbnail)}`;
    material = new THREE.MeshBasicMaterial({
      map: loader.load(imgUrl),
      color: "#ffffff"
    });
  } else {
    material = new MeshBasicMaterial({color});
  }
  const mesh = new Mesh(geometry, material);
  try {
    if (!position || typeof position === "undefined") {
      position = [8*(Math.random() - 0.5), 1 + Math.random(), 1 + 4*Math.random()]
    }
    mesh.position.set(...position);
  } catch(err) {
    console.log(err);
  }
  if(rotation) {
    mesh.rotation.set(...rotation);
  }
  mesh.userData.name = title;
  mesh.userData.path = path;
  mesh.userData.color = color;
  mesh.userData.id = id;
  booksGroup.add(mesh);
};

const addBooks = async (scene) => {
  const arr = await books();
  booksGroup = new Group();
  window.booksGroup = booksGroup;
  for (const {_id: id, path, title, thumbnail, position, rotation, color} of arr) {
    displayBook({id, path, title, thumbnail, position, rotation, color});
  }
  scene.add(booksGroup);

  initialized = true;
};

const liveServerSocket = async () => {
  const delay = 1000;
  const timeout = 10000;
  const now = new Date();
  ws = await new Promise((resolve, reject) => {
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

export const getIntersection = (controller) => {
  if(initialized === false) {
    return {distance: Infinity};
  }

  // set raycaster from controller
  tempMatrix.identity().extractRotation( controller.matrixWorld );
  raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
  raycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( tempMatrix );

  // test against books
  const intersection = raycaster.intersectObject(booksGroup, true);
  if(intersection.length && intersection[0].distance > 0) {
    return intersection[0];
  }

  return {distance: Infinity};
};

const _selectedBookTextCanvas = (text) => {
  const txtcanvas = document.createElement("canvas");
  const ctx = txtcanvas.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = "40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 150, 30);

  return new CanvasTexture(txtcanvas);
};

const _selectedBookPlane = (texture) => {
  const plane = new Mesh(
    new PlaneBufferGeometry(0.5, 0.1),
    new MeshBasicMaterial({
      color: 0xffffff,
      map: texture,
      transparent: true,
      opacity: 1,
      side: DoubleSide
    })
  );
  plane.name = "plane";

  return plane;
};

const _positionSelectedBookName = (plane) => {
  const camera = cameraRig.getObjectByName("camera");
  camera.getWorldPosition(tempVector3);

  plane.position.copy(selectedBook.position);
  plane.position.y += 0.2;
  plane.lookAt(tempVector3);
  plane.up.set(0, 1, 0);

  plane.updateMatrixWorld();
  plane.matrix.copy(plane.matrixWorld);

  selectedBook.updateMatrixWorld();
  selectedBook.matrix.copy(selectedBook.matrixWorld);

  tempMatrix.copy(selectedBook.matrixWorld).invert();
  plane.applyMatrix4(tempMatrix);
};

const addSelectedBookName = () => {
  const texture = _selectedBookTextCanvas(selectedBook.userData.name);
  const plane = _selectedBookPlane(texture);
  _positionSelectedBookName(plane);
  selectedBook.add(plane);
};

const removeSelectedBookName = () => {
  const plane = selectedBook.getObjectByName("plane");
  plane.parent.remove(plane);
};

export const intersectionStart = (e) => {
  if(selectedBook === null) {
    selectedBook = e.object;
    addSelectedBookName();
  }
};

export const intersectionEnd = () => {
  removeSelectedBookName();
  selectedBook = null;
};

export const init = async (scene) => {
  ws = await liveServerSocket();
  setWS(ws);
  await addBooks(scene);
};
