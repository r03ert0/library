// tractor.js
// client-side code

import {Box3, Vector3} from './node_modules/three/build/three.module.js';

let tick = 0;
const tractorTick = 5; // interval for testing the joystick
let renderer;
const controllerPos = new Vector3(0, 0, 0);
const objPos = new Vector3();
const displacement = new Vector3();

const updateObjectPosition = (controller, obj, val) => {
  const direction = (val<0)?(-1):1;

  // centroid
  const bbox = new Box3().setFromObject(obj);
  var centroid = new Vector3();
  centroid.addVectors(bbox.min, bbox.max);
  centroid.multiplyScalar(0.5);
  controller.worldToLocal(centroid);

  // compute fractional displacement
  displacement.copy(controllerPos);
  displacement.sub(centroid).multiplyScalar(direction/10);

  // get object position
  objPos.copy(obj.position);

  // add displacement to position
  objPos.add(displacement);

  // apply new position
  obj.position.copy(objPos);
};

const _update = (controller, obj) => {
  const session = renderer.xr.getSession();
  if (!session) {
    return;
  }

  for (const source of session.inputSources) {
    if (!source || !source.handedness || !source.gamepad) {
      continue;
    }

    if(source.handedness !== "right") {
      continue;
    }

    /*
    Axes xr-standard Mapping Required
    axes[0] Primary touchpad X No
    axes[1] Primary touchpad Y No
    axes[2] Primary thumbstick X No
    axes[3] Primary thumbstick Y No
    */

    const axes = source.gamepad.axes.slice(0);
    if(Math.abs(axes[3])<0.1) {
      continue;
    }

    updateObjectPosition(controller, obj, axes[3]);
  }
};

export const update = (controller, obj) => {
  if((tick++)%tractorTick === 0) {
    _update(controller, obj);
  }
};

export const init = (aRenderer) => {
  renderer = aRenderer;
};
