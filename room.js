import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';

export const addRoom = async (scene) => {
  // room
  const loader = new GLTFLoader();

  const floor = await new Promise((resolve) => {
    loader.load('./assets/room.glb', ( gltf ) => {
      scene.add(gltf.scene);
      const res = gltf.scene.getObjectByName("floor");
      resolve(res);
    });
  });

  return {floor};
};
