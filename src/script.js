import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import GUI from 'lil-gui';

// Scene Setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Physics setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.1,
  restitution: 0.7,
});
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
  material: defaultMaterial,
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Objects to update list
const objectsToUpdate = [];

// Sound setup
const hitSound = new Audio('../static/sounds/hit.mp3');
const playHitSound = (collision) => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();
  if (impactStrength > 1.5) {
    hitSound.volume = Math.random();
    hitSound.currentTime = 0;
    hitSound.play();
  }
};

// Sphere creation
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.4 });

function createSphere(radius = 1, position = new THREE.Vector3(0, 5, 0)) {
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({ mass: 1, material: defaultMaterial });
  body.addShape(shape);
  body.position.copy(position);
  body.addEventListener('collide', playHitSound);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });
}

// Box creation
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.4 });

function createBox(width = 1, height = 1, depth = 1, position = new THREE.Vector3(0, 5, 0)) {
  const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
  const shape = new CANNON.Box(halfExtents);
  const body = new CANNON.Body({ mass: 1, material: defaultMaterial });
  body.addShape(shape);
  body.position.copy(position);
  body.addEventListener('collide', playHitSound);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });
}

// GUI setup
const gui = new GUI();
const debugObject = {};

// Sphere GUI controls
debugObject.createSphere = () => {
  const radius = Math.random() * 0.5 + 0.5;
  const x = (Math.random() - 0.5) * 5;
  createSphere(radius, new THREE.Vector3(x, 5, 0));
};
gui.add(debugObject, 'createSphere').name('Create Sphere');

// Box GUI controls
debugObject.createBox = () => {
  const width = Math.random() * 0.5 + 0.5;
  const height = Math.random() * 0.5 + 0.5;
  const depth = Math.random() * 0.5 + 0.5;
  const x = (Math.random() - 0.5) * 5;
  createBox(width, height, depth, new THREE.Vector3(x, 5, 0));
};
gui.add(debugObject, 'createBox').name('Create Box');

// Reset all
debugObject.reset = () => {
  for (const object of objectsToUpdate) {
    // Remove event listener
    object.body.removeEventListener('collide', playHitSound);
    // Remove body from physics world
    world.removeBody(object.body);
    // Remove mesh from scene
    scene.remove(object.mesh);
  }
  objectsToUpdate.splice(0, objectsToUpdate.length);
};
gui.add(debugObject, 'reset').name('Reset Scene');

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate loop
const clock = new THREE.Clock();
let oldElapsedTime = 0;

function animate() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);

  for (const obj of objectsToUpdate) {
    obj.mesh.position.copy(obj.body.position);
    obj.mesh.quaternion.copy(obj.body.quaternion);
  }

  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

animate();