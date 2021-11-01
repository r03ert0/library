import {OrbitControls} from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import {VRButton} from './node_modules/three/examples/jsm/webxr/VRButton.js';
import {XRControllerModelFactory} from './node_modules/three/examples/jsm/webxr/XRControllerModelFactory.js';
import {addRoom} from "./room.js";

let camera, cameraRig, controls, renderer, scene;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let rightHand = null;
let leftHand = null;
let debounce;
const intersectionFunctions = [];
const updateFunctions = [];
const rightHandSelectStartFunctions = [];
const rightHandSelectEndFunctions = [];

THREE.Cache.enabled = false;

const indexOfMinimumIntersectionDistance = (intersections) => {
  let minDistance = Infinity;
  let indexMin;
  for(let i=0; i<intersections.length; i++) {
    const intersection = intersections[i];
    if(intersection.distance < minDistance) {
      minDistance = intersection.distance;
      indexMin = i;
    }
  }

  return indexMin;
};

let prevIndexMin = -1;
const handleIntersections = () => {
  const line = rightHand.getObjectByName( 'line' );

  // return if no laser
  if (typeof line === "undefined") {
    return;
  }

  // set laser length to maximum
  line.scale.z = line.userData.maxRayLength;

  // call all intersection functions
  const intersections = intersectionFunctions.map(
    (intersectionFunction) => intersectionFunction.getIntersection()
  );
  const indexMin = indexOfMinimumIntersectionDistance(intersections);

  if(indexMin >= 0 ) {
    // if intersection, adjust the laser length
    line.scale.z = intersections[indexMin].distance;

    // call the corresponding intersectionStart function
    intersectionFunctions[indexMin].intersectionStart(intersections[indexMin]);

    // if the intersected object is not the same as before, call
    // intersectionEnd on the previous one
    if(prevIndexMin >= 0 && indexMin !== prevIndexMin && intersectionFunctions[prevIndexMin].intersectionEnd) {
      intersectionFunctions[prevIndexMin].intersectionEnd();
    }

    // remember the intersected object
    prevIndexMin = indexMin;
  } else if (prevIndexMin >= 0 && intersectionFunctions[prevIndexMin].intersectionEnd) {
    // if there no intersection, but there was one before,
    // call intersectionEnd on that object
    intersectionFunctions[prevIndexMin].intersectionEnd();
    prevIndexMin = -1;
  }
};

const handleUpdates = () => {
  for(const func of updateFunctions) {
    func();
  }
};

// right hand trigger start
const handleRightHandSelectStart = (e) => {
  if (e.timeStamp - debounce < 100) { return; }
  debounce = e.timeStamp;

  for(const func of rightHandSelectStartFunctions) {
    if (func()) {
      return;
    }
  }
};

// right hand trigger end
const handleRightHandSelectEnd = (e) => {
  if (e.timeStamp - debounce < 100) { return; }
  debounce = e.timeStamp;

  for(const func of rightHandSelectEndFunctions) {
    if (func()) {
      return;
    }
  }
};

const handleRightHandSqueezeStart = () => {};

const handleRightHandSqueezeEnd = () => {};

const handleLeftHandSelectStart = () => {};

const handleLeftHandSelectEnd = () => {};

const setRightHand = (controller) => {
  rightHand = controller;

  // right hand laser
  const geometry = new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 )] );
  const line = new THREE.Line( geometry );
  line.name = 'line';
  line.userData.maxRayLength = 5;
  controller.add(line.clone());

  // actions
  rightHand.addEventListener( 'selectstart', handleRightHandSelectStart);
  rightHand.addEventListener( 'selectend', handleRightHandSelectEnd);
  rightHand.addEventListener( 'squeezestart', handleRightHandSqueezeStart);
  rightHand.addEventListener( 'squeezeend', handleRightHandSqueezeEnd);
};

const setLeftHand = async (controller, controllerGrip) => {
  leftHand = controller;

  leftHand.addEventListener( 'selectstart', handleLeftHandSelectStart);
  leftHand.addEventListener( 'selectend', handleLeftHandSelectEnd);
};

const addControllerProps = (data, controller, controllerGrip) => {
  const {handedness} = data;

  switch (handedness) {
  case 'right':
    setRightHand(controller);
    break;
  case 'left':
    setLeftHand(controller, controllerGrip);
    break;
  }
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
};

const loop = () => {
  if (rightHand && leftHand) {
    handleIntersections();
    handleUpdates();
  }

  controls.update();
  renderer.render( scene, camera );
};

/* eslint-disable max-statements */
const initThree = async () => {
  const WIDTH = window.innerWidth;
  const HEIGHT = window.innerHeight;

  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x7f7f7f );

  // camera rig
  cameraRig = new THREE.Group();
  cameraRig.name = "cameraRig";
  window.cameraRig = cameraRig;
  cameraRig.position.set(0, 0, 0);
  camera = new THREE.PerspectiveCamera( 60, WIDTH / HEIGHT, 0.1, 100 );
  camera.position.set( 0, 1.6, 0 );
  camera.name = "camera";
  cameraRig.add(camera);
  scene.add(cameraRig);

  // renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( WIDTH, HEIGHT );
  renderer.xr.enabled = true;
  renderer.localClippingEnabled = true;
  document.body.appendChild( renderer.domElement );

  // controls
  controls = new OrbitControls( camera, renderer.domElement );
  controls.target = new THREE.Vector3( 0, 1, -1.8 );
  controls.update();

  // VR button
  document.body.appendChild(VRButton.createButton(renderer));

  // Room (room's floor is later used for teleportation)
  const {floor} = await addRoom(scene);

  /**
   * add controllers
   */

  // light for the controllers
  const light = new THREE.PointLight( 0xffffff, 1, 100 );
  light.name = "light";
  light.position.set( 0, 2, 0 );
  cameraRig.add( light );

  // right hand
  const controllerModelFactory = new XRControllerModelFactory();
  controller1 = renderer.xr.getController(0);
  cameraRig.add( controller1 );
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  cameraRig.add(controllerGrip1);

  // left hand
  controller2 = renderer.xr.getController(1);
  cameraRig.add( controller2 );
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
  cameraRig.add(controllerGrip2);

  /**
   * Events
   */

  // push intersection detection and handling functions
  // intersectionFunctions.push({ name, getIntersection, intersectionStart });

  // push update functions
  // updateFunctions.push();

  // push right hand selectStart functions
  // rightHandSelectStartFunctions.push();

  // push right hand selectEnd functions
  // rightHandSelectEndFunctions.push();

  // start animation
  renderer.setAnimationLoop( loop );

  // handle resize events
  window.addEventListener('resize', onWindowResize );
};
/* eslint-enable max-statements */

const main = async () => {
  await initThree();

  controller1.addEventListener( 'connected', (event) => {
    addControllerProps(event.data, controller1, controllerGrip1);
  });

  controller2.addEventListener( 'connected', (event) => {
    addControllerProps(event.data, controller2, controllerGrip2);
  });
};

main();
