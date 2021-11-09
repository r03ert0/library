/* global THREE */

/*
Implements:

Called from:
handleRightHandSqueezeStart
handleRightHandSqueezeEnd
loop
*/

const Move = {
  position: new THREE.Vector3(),
  matrix: new THREE.Matrix4(),
  quaternion: new THREE.Quaternion()
};

export let moving = false;

export const startMoving = (mesh, controller) => {
  if (mesh === null || controller === null) {
    return;
  }

  moving = true;

  mesh.updateMatrixWorld();
  mesh.matrix.copy(mesh.matrixWorld);
  Move.matrix.copy(controller.matrixWorld).invert();
  mesh.applyMatrix4(Move.matrix);
  controller.add(mesh);
};

export const stopMoving = (mesh, parent) => {
  if (mesh === null) {
    return;
  }

  moving = false;

  const {position} = Move;
  mesh.getWorldPosition(position);
  mesh.getWorldQuaternion(Move.quaternion);

  parent.add(mesh);

  mesh.position.copy(position);
  mesh.rotation.setFromQuaternion(Move.quaternion);
};
