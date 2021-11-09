/* eslint-disable no-unused-vars */
/* global THREE */

/*
Implements:
init
getIntersection
intersectionStart
intersectionEnd
update

Called from:
initThree
rightHandSelectStartFunctions
*/

const Teleport = {
  cameraRig: null,
  initialized: false,
  raycaster: new THREE.Raycaster(),
  renderer: null,
  scene: null,
  teleportSpot: null,
  tempMatrix: new THREE.Matrix4(),
  tick: 0,
  turnTick: 10, // interval for testing the joystick
};

export const jump = () => {
  if(Teleport.teleportSpot.visible === false) {
    return;
  }
  Teleport.cameraRig.position.copy(Teleport.teleportSpot.position);
}

const turnUpdate = () => {
  const session = Teleport.renderer.xr.getSession();
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
    if(Math.abs(axes[2])<0.5) {
      // ignore small joystick movements
      continue;
    }
    if(Math.abs(axes[3])>0.3) {
      // ignore oblique joystick movements
      continue;
    }
    const {rotation} = Teleport.cameraRig;
    Teleport.cameraRig.rotation.set(
      rotation.x,
      rotation.y + Math.PI/4*(1-2*(axes[2]>0.5)),
      rotation.z
    );
  }
};

export const getIntersection = (controller, floor) => {
  if(Teleport.initialized === false) {
    return {distance: Infinity};
  }

  Teleport.teleportSpot.visible = false;

  // set raycaster from controller
  Teleport.tempMatrix.identity().extractRotation( controller.matrixWorld );
  Teleport.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
  Teleport.raycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( Teleport.tempMatrix );

  // test against floor
  const intersection = Teleport.raycaster.intersectObject(floor);
  if(intersection.length && intersection[0].distance > 0) {
    return intersection[0];
  }

  return {distance: Infinity};
};

export const intersectionStart = (intersection) => {
  Teleport.teleportSpot.position.copy(intersection.point);
  Teleport.teleportSpot.visible = true;
};

export const update = (controller, floor) => {
  // check joystick
  if((Teleport.tick++)%Teleport.turnTick === 0) {
    turnUpdate();
  }
};

export const init = (scene, renderer, cameraRig) => {
  Teleport.cameraRig = cameraRig;
  Teleport.initialized = true;
  Teleport.renderer = renderer;
  Teleport.scene = scene;
  Teleport.teleportSpot = new THREE.Mesh(
    new THREE.CylinderBufferGeometry(0.1, 0.1, 0.02),
    new THREE.MeshBasicMaterial({color: "red"})
  );
  Teleport.teleportSpot.position.set(0, 0, -4);
  Teleport.teleportSpot.visible = false;
  scene.add(Teleport.teleportSpot);
};
