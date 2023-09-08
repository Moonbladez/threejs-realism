import "./style.css";

import { GUI } from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

interface Global {
  envMapIntensity: number;
}

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

/**
 * Base
 */
// Debug
const gui = new GUI();
const environmentFolder = gui.addFolder("Environment").close();
const lightsFolder = gui.addFolder("Directional Light").close();
const shadowsFolder = gui.addFolder("Shadows").close();
const render = gui.addFolder("Render").close();
const global: Global = {
  envMapIntensity: 1,
};

// Canvas
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();

/**
 * Update all materials
 */
const updateAllMaterials = (): void => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.receiveShadow = true;
      child.castShadow = true;
      child.material.envMapIntensity = global.envMapIntensity;
    }
  });
};
/**
 * Environment map
 */
// Global intensity
environmentFolder
  .add(global, "envMapIntensity")
  .min(0)
  .max(10)
  .step(0.001)
  .onChange(updateAllMaterials)
  .name("Intensity");

// HDR (RGBE) equirectangular
rgbeLoader.load("/environmentMaps/0/2k.hdr", (environmentMap) => {
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = environmentMap;
  scene.environment = environmentMap;
});

/**
 * Lights
 */
// Directional light
const directionalLight = new THREE.DirectionalLight("#ffffff", 2);
directionalLight.position.set(-4, 6.5, 2.5);
//target
directionalLight.target.position.set(0, 0, 4);
directionalLight.target.updateWorldMatrix(true, true);

//near and far
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.mapSize.set(1024, 1024);
scene.add(directionalLight);
//helper
const directionalLightHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(directionalLightHelper);
lightsFolder.add(directionalLight, "intensity").min(0).max(10).step(0.001).name("Intensity");
lightsFolder.add(directionalLight.position, "x").min(-10).max(10).step(0.001).name("X");
lightsFolder.add(directionalLight.position, "y").min(-10).max(10).step(0.001).name("Y");
lightsFolder.add(directionalLight.position, "z").min(-10).max(10).step(0.001).name("Z");
lightsFolder.add(directionalLightHelper, "visible").name("Helper");

//shadows
directionalLight.castShadow = true;
shadowsFolder.add(directionalLight, "castShadow").name("Enable");

/**
 * Models
 */
// Helmet
gltfLoader.load("/models/FlightHelmet/glTF/FlightHelmet.gltf", (gltf) => {
  gltf.scene.scale.set(10, 10, 10);
  scene.add(gltf.scene);

  updateAllMaterials();
});

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(4, 5, 4);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.y = 3.5;
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//tone maping
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 3;

render
  .add(renderer, "toneMapping", {
    No: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping,
  })
  .name("Tone mapping");
render.add(renderer, "toneMappingExposure").min(0.9).max(10).step(0.001).name("Exposure");

//Physical correct light
renderer.useLegacyLights = false;
lightsFolder.add(renderer, "useLegacyLights").name("Physical correct light");

/**
 * Shadows
 */
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
