import { GLTFLoader } from 'https://unpkg.com/three@0.136.0/examples/jsm/loaders/GLTFLoader.js?module';

export const addRoom = async ({scene, usePassthrough }) => {
  // room
  const loader = new GLTFLoader();
  const roomPath = usePassthrough?'./assets/floor.glb':'./assets/room.glb';

  const floor = await new Promise((resolve) => {
    loader.load(roomPath, ( gltf ) => {
      scene.add(gltf.scene);
      const res = gltf.scene.getObjectByName("floor");
      resolve(res);
    });
  });

  return {floor};
};
