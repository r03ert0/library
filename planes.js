// import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';

let THREE;
let scene;
let renderer;

const allPlaneOrigins = [];
export let reticle;

const planeMaterials = [];
let lineMaterials = [];
let lineGeometries = [];
let baseOriginGroup;

let anchorId = 1;
let allAnchors = new Map();
export const processAnchors = (timestamp, frame) => {
    const referenceSpace = renderer.xr.getReferenceSpace();
  
    if (frame.trackedAnchors) {
      allAnchors.forEach((anchorContext, anchor) => {
        if (!frame.trackedAnchors.has(anchor)) {
          // anchor was removed
          allAnchors.delete(anchor);
          console.debug("Anchor no longer tracked, id=" + anchorContext.id);
  
          scene.remove(anchorContext.mesh);
        }
      });
  
      frame.trackedAnchors.forEach(anchor => {
        if (allAnchors.has(anchor)) {
          const anchorContext = allAnchors.get(anchor);
          const anchorPose = frame.getPose(anchor.anchorSpace, referenceSpace);
          // update pose
          if (anchorPose) {
            anchorContext.mesh.visible = true;
            anchorContext.mesh.matrix.fromArray(anchorPose.transform.matrix);
          } else {
            anchorContext.mesh.visible = false;
          }
        } else {
          console.error("New anchors should be processed in a createAnchor(...).then() promise");
        }
      });
    }
};

const createGeometryFromPolygon = (polygon) => {
    const geometry = new THREE.BufferGeometry();
  
    const vertices = [];
    const uvs = [];
    polygon.forEach(point => {
      vertices.push(point.x, point.y, point.z);
      uvs.push(point.x, point.z);
    })
  
    const indices = [];
    for(let i = 2; i < polygon.length; ++i) {
      indices.push(0, i-1, i);
    }
  
    geometry.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv',
      new THREE.BufferAttribute(new Float32Array(uvs), 2))
    geometry.setIndex(indices);
  
    return geometry;
};

let planeId = 1;
let allPlanes = new Map();
export const processPlanes = (timestamp, frame) => {
  const referenceSpace = renderer.xr.getReferenceSpace();

  if (frame.detectedPlanes) {
    allPlanes.forEach((planeContext, plane) => {
      if (!frame.detectedPlanes.has(plane)) {
        // plane was removed
        allPlanes.delete(plane);
        console.debug("Plane no longer tracked, id=" + planeContext.id);

        scene.remove(planeContext.mesh);
      }
    });

    frame.detectedPlanes.forEach(plane => {
      const planePose = frame.getPose(plane.planeSpace, referenceSpace);
      let planeMesh;

      if (allPlanes.has(plane)) {
        // may have been updated:
        const planeContext = allPlanes.get(plane);
        planeMesh = planeContext.mesh;

        if (planeContext.timestamp < plane.lastChangedTime) {
          // updated!
          planeContext.timestamp = plane.lastChangedTime;

          const geometry = createGeometryFromPolygon(plane.polygon);
          planeContext.mesh.geometry.dispose();
          planeContext.mesh.geometry = geometry;
        }
      } else {
        // new plane
        
        // Create geometry:
        const geometry = createGeometryFromPolygon(plane.polygon);
        planeMesh = new THREE.Mesh(geometry,
          planeMaterials[planeId % planeMaterials.length]
        );
        
        planeMesh.matrixAutoUpdate = false;

        scene.add(planeMesh);

        // Create plane origin visualizer:
        const originGroup = baseOriginGroup.clone();
        originGroup.visible = false; //usePlaneOrigin.checked;

        planeMesh.add(originGroup);
        allPlaneOrigins.push(originGroup);

        const planeContext = {
          id: planeId,
          timestamp: plane.lastChangedTime,
          mesh: planeMesh,
          origin: originGroup,
        };

        allPlanes.set(plane, planeContext);
        console.debug("New plane detected, id=" + planeId);
        planeId++;
      }

      if (planePose) {
        planeMesh.visible = true;
        planeMesh.matrix.fromArray(planePose.transform.matrix);
      } else {
        planeMesh.visible = false;
      }
    });
  }
};

export const configure = (aTHREE, aScene, aRendered) => {
    THREE = aTHREE;
    scene = aScene;
    renderer = aRendered;

    lineMaterials = [
        new THREE.LineBasicMaterial({color: 0xff0000}),
        new THREE.LineBasicMaterial({color: 0x00ff00}),
        new THREE.LineBasicMaterial({color: 0x0000ff}),
    ];
    lineGeometries = [
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0.1,0,0)]),
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.1,0)]),
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0.1)]),
    ];
    baseOriginGroup = new THREE.Group();
    baseOriginGroup.add(new THREE.Line(lineGeometries[0], lineMaterials[0]));
    baseOriginGroup.add(new THREE.Line(lineGeometries[1], lineMaterials[1]));
    baseOriginGroup.add(new THREE.Line(lineGeometries[2], lineMaterials[2]));

    const loadManager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(loadManager);
    const gridTexture = loader.load('https://raw.githubusercontent.com/google-ar/arcore-android-sdk/c684bbda37e44099c273c3e5274fae6fccee293c/samples/hello_ar_c/app/src/main/assets/models/trigrid.png');
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
  
    const createPlaneMaterial = (params) => 
    new THREE.MeshBasicMaterial(Object.assign(params, {
      map: gridTexture,
      opacity: 0.6,
      transparent: true,
    }));
    planeMaterials.push(createPlaneMaterial({color: 0xff0000}));
    planeMaterials.push(createPlaneMaterial({color: 0x00ff00}));
    planeMaterials.push(createPlaneMaterial({color: 0x0000ff}));
    planeMaterials.push(createPlaneMaterial({color: 0xffff00}));
    planeMaterials.push(createPlaneMaterial({color: 0x00ffff}));
    planeMaterials.push(createPlaneMaterial({color: 0xff00ff}));

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
};
