import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function initBL60Model({ canvas, status, controlsRoot, compact = false }) {
  if (!canvas) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef3f7);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(compact ? 6.8 : 8.6, compact ? 4.5 : 5.2, compact ? 8.0 : 9.4);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const target = new THREE.Vector3(-0.55, 0.08, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.copy(target);
  controls.minDistance = compact ? 4.8 : 5.6;
  controls.maxDistance = compact ? 14 : 18;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  const materials = createMaterials();
  const model = new THREE.Group();
  model.name = "BL60-160 reference model";
  model.scale.setScalar(compact ? 0.72 : 0.66);
  model.position.y = compact ? 0.05 : 0.16;
  scene.add(model);

  buildModel(model, materials);
  addEnvironment(scene);
  bindControls({ controlsRoot, controls, camera, target, status, compact });
  resize();

  if (status) status.textContent = "Model ready";

  let frame = 0;
  function animate() {
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resize);
  animate();

  return {
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    }
  };
}

function createMaterials() {
  const carbonTexture = createCarbonTexture();
  return {
    body: new THREE.MeshPhysicalMaterial({
      color: 0xb8c2c9,
      roughness: 0.34,
      metalness: 0.16,
      clearcoat: 0.34,
      clearcoatRoughness: 0.34
    }),
    underside: new THREE.MeshPhysicalMaterial({
      color: 0xa9b4bc,
      roughness: 0.44,
      metalness: 0.12,
      clearcoat: 0.18
    }),
    carbon: new THREE.MeshStandardMaterial({
      color: 0x0c0d0f,
      roughness: 0.62,
      metalness: 0.12,
      map: carbonTexture
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x20252b,
      roughness: 0.5,
      metalness: 0.18
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x7f8a93,
      roughness: 0.34,
      metalness: 0.34
    }),
    line: new THREE.LineBasicMaterial({
      color: 0x6d7884,
      transparent: true,
      opacity: 0.55
    }),
    hatch: new THREE.MeshBasicMaterial({
      color: 0x6d7884,
      transparent: true,
      opacity: 0.42
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x225ee8,
      emissive: 0x112a82,
      emissiveIntensity: 0.18,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02
    })
  };
}

function buildModel(root, mat) {
  root.add(makeFuselage(mat.body));
  root.add(makeLowerPod(mat.underside));
  root.add(makeWing(1, mat.body), makeWing(-1, mat.body));
  root.add(makeWingDetails(1, mat), makeWingDetails(-1, mat));
  root.add(makeCenterFairing(mat.body));
  root.add(makeDorsalDetails(mat));
  root.add(makeHorizontalTail(1, mat.body), makeHorizontalTail(-1, mat.body), makeVerticalTail(mat.body));
  root.add(makeCameraPod(mat));
  root.add(makeLandingSkid(1, mat.underside), makeLandingSkid(-1, mat.underside));

  [-1, 1].forEach((side) => {
    root.add(makeMotorAssembly(side, -0.62, 3.18, mat));
    root.add(makeWingStruts(side, mat.underside));
  });

  addPanelLines(root, mat.line);
  addHatches(root, mat);
}

function makeFuselage(material) {
  const profile = [
    [0.02, -3.2],
    [0.18, -3.05],
    [0.34, -2.74],
    [0.46, -2.1],
    [0.55, -0.9],
    [0.58, 0.7],
    [0.5, 1.85],
    [0.36, 2.55],
    [0.15, 2.98],
    [0.02, 3.14]
  ].map(([radius, length]) => new THREE.Vector2(radius, length));

  const geometry = new THREE.LatheGeometry(profile, 72);
  geometry.rotateZ(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLowerPod(material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 36, 24), material);
  mesh.scale.set(1.35, 0.45, 0.78);
  mesh.position.set(1.35, -0.38, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCenterFairing(material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 36, 18), material);
  mesh.scale.set(1.48, 0.34, 1.1);
  mesh.position.set(-0.55, 0.04, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeDorsalDetails(mat) {
  const group = new THREE.Group();

  const topPod = new THREE.Mesh(new THREE.SphereGeometry(0.28, 40, 20), mat.body);
  topPod.scale.set(1.05, 0.58, 0.82);
  topPod.position.set(0.78, 0.58, 0);
  topPod.castShadow = true;
  topPod.receiveShadow = true;
  group.add(topPod);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 32), mat.underside);
  neck.position.set(0.78, 0.44, 0);
  neck.castShadow = true;
  neck.receiveShadow = true;
  group.add(neck);

  const noseHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.012, 56, 1, true), mat.hatch);
  noseHatch.rotation.x = Math.PI / 2;
  noseHatch.position.set(2.48, 0.59, 0);
  group.add(noseHatch);

  const centerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.28), mat.underside);
  centerDoor.position.set(-1.04, 0.57, 0);
  centerDoor.castShadow = true;
  centerDoor.receiveShadow = true;
  group.add(centerDoor);

  return group;
}

function makeWing(side, material) {
  const points = roundedWingPoints(side);
  const geometry = createPrismGeometry(points, 0.055, 0.075);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedWingPoints(side) {
  const s = side;
  const points = [
    [0.24, 0.58 * s],
    [0.1, 5.48 * s]
  ];
  const centerX = -0.86;
  const centerZ = 5.56 * s;
  const rx = 0.98;
  const rz = 0.48 * s;
  const steps = 10;
  for (let i = 0; i <= steps; i += 1) {
    const angle = THREE.MathUtils.degToRad(68 - (136 * i) / steps);
    points.push([centerX + Math.sin(angle) * rx, centerZ + Math.cos(angle) * rz]);
  }
  points.push([-1.74, 0.62 * s]);
  return points;
}

function createPrismGeometry(points, topY, thickness) {
  const top = points.map(([x, z]) => new THREE.Vector3(x, topY, z));
  const bottom = points.map(([x, z]) => new THREE.Vector3(x, topY - thickness, z));
  const vertices = [...top, ...bottom];
  const positions = new Float32Array(vertices.flatMap((point) => [point.x, point.y, point.z]));
  const triangles = THREE.ShapeUtils.triangulateShape(
    points.map(([x, z]) => new THREE.Vector2(x, z)),
    []
  );
  const indices = [];
  triangles.forEach(([a, b, c]) => {
    indices.push(a, b, c);
    indices.push(c + points.length, b + points.length, a + points.length);
  });
  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    indices.push(i, next, next + points.length);
    indices.push(i, next + points.length, i + points.length);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWingDetails(side, mat) {
  const group = new THREE.Group();
  const s = side;

  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.014, 3.96), mat.underside);
  flap.position.set(-1.5, 0.108, 3.48 * s);
  flap.castShadow = true;
  flap.receiveShadow = true;
  group.add(flap);

  const hingeLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.18, 0.124, 1.04 * s),
    new THREE.Vector3(-1.18, 0.124, 5.32 * s)
  ]);
  group.add(new THREE.Line(hingeLine, mat.line));

  for (const z of [1.18, 3.08, 4.86]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.22), mat.metal);
    hinge.position.set(-1.18, 0.148, z * s);
    hinge.castShadow = true;
    hinge.receiveShadow = true;
    group.add(hinge);
  }

  const servicePanel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.58), mat.metal);
  servicePanel.position.set(-0.62, 0.142, 2.06 * s);
  servicePanel.castShadow = true;
  servicePanel.receiveShadow = true;
  group.add(servicePanel);

  const motorBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.54), mat.underside);
  motorBase.position.set(-0.56, 0.145, 3.18 * s);
  motorBase.castShadow = true;
  motorBase.receiveShadow = true;
  group.add(motorBase);

  for (const x of [-0.9, -0.42]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.24), mat.metal);
    plate.position.set(x, 0.17, 3.18 * s);
    plate.castShadow = true;
    group.add(plate);
  }

  return group;
}

function makeHorizontalTail(side, material) {
  const geometry = createPrismGeometry([
    [2.05, 0.16 * side],
    [1.08, 0.2 * side],
    [1.08, 1.33 * side],
    [2.02, 1.36 * side]
  ], 0.19, 0.055);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeVerticalTail(material) {
  const vertices = new Float32Array([
    1.28, 0.2, -0.045,
    2.25, 0.2, -0.045,
    2.52, 1.34, -0.045,
    1.54, 1.42, -0.045,
    1.28, 0.2, 0.045,
    2.25, 0.2, 0.045,
    2.52, 1.34, 0.045,
    1.54, 1.42, 0.045
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(faceIndices());
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePlanformGeometry(points, thickness) {
  const top = points.flat();
  const bottom = points.map(([x, y, z]) => [x, y - thickness, z]).flat();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([...top, ...bottom]), 3));
  geometry.setIndex(faceIndices());
  geometry.computeVertexNormals();
  return geometry;
}

function faceIndices() {
  return [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0
  ];
}

function makeMotorAssembly(side, x, zAbs, mat) {
  const group = new THREE.Group();
  const z = zAbs * side;

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.48, 36), mat.body);
  column.position.set(x, 0.38, z);
  column.castShadow = true;
  column.receiveShadow = true;
  group.add(column);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.13, 36), mat.body);
  cap.position.set(x, 0.68, z);
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 36), mat.dark);
  spinner.position.set(x, 0.82, z);
  spinner.castShadow = true;
  group.add(spinner);

  const prop = makePropBlade(mat.carbon);
  prop.position.set(x, 0.86, z);
  prop.rotation.y = side > 0 ? Math.PI * 0.02 : -Math.PI * 0.02;
  group.add(prop);

  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.45), mat.metal);
  mount.position.set(x, 0.22, z);
  mount.castShadow = true;
  mount.receiveShadow = true;
  group.add(mount);

  return group;
}

function makePropBlade(material) {
  const geometry = createPrismGeometry([
    [-1.52, 0],
    [-1.28, 0.055],
    [-0.14, 0.035],
    [0, 0.02],
    [0.14, 0.035],
    [1.28, 0.055],
    [1.52, 0],
    [1.28, -0.055],
    [0.14, -0.035],
    [0, -0.02],
    [-0.14, -0.035],
    [-1.28, -0.055]
  ], 0.018, 0.036);
  const blade = new THREE.Mesh(geometry, material);
  blade.castShadow = true;
  return blade;
}

function makeWingStruts(side, material) {
  const group = new THREE.Group();
  const z = 3.18 * side;
  group.add(cylinderBetween(new THREE.Vector3(-0.76, -0.12, z - 0.36 * side), new THREE.Vector3(0.18, -0.1, z - 0.64 * side), 0.022, material));
  group.add(cylinderBetween(new THREE.Vector3(-1.34, -0.13, z + 0.18 * side), new THREE.Vector3(-1.92, -0.1, z + 0.42 * side), 0.02, material));
  return group;
}

function makeCameraPod(mat) {
  const group = new THREE.Group();
  group.add(cylinderBetween(new THREE.Vector3(1.58, -0.28, 0), new THREE.Vector3(1.63, -0.62, 0), 0.08, mat.underside));

  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.5), mat.underside);
  yoke.position.set(1.66, -0.62, 0);
  yoke.castShadow = true;
  yoke.receiveShadow = true;
  group.add(yoke);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), mat.underside);
  ball.scale.set(0.88, 1.05, 1.05);
  ball.position.set(1.82, -0.92, 0);
  ball.castShadow = true;
  ball.receiveShadow = true;
  group.add(ball);

  [
    [2.1, -0.84, -0.1, 0.08],
    [2.105, -0.99, 0.08, 0.125],
    [2.108, -0.77, 0.12, 0.06]
  ].forEach(([x, y, z, radius]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.18, 0.025, 40), mat.dark);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(x, y, z);
    group.add(ring);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.03, 40), mat.glass);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(x + 0.018, y, z);
    group.add(lens);
  });

  return group;
}

function makeLandingSkid(side, material) {
  const group = new THREE.Group();
  const z = 0.48 * side;
  group.add(cylinderBetween(new THREE.Vector3(0.42, -0.82, z), new THREE.Vector3(1.74, -0.84, z), 0.035, material));
  group.add(cylinderBetween(new THREE.Vector3(0.72, -0.34, z), new THREE.Vector3(0.62, -0.82, z), 0.028, material));
  group.add(cylinderBetween(new THREE.Vector3(1.46, -0.36, z), new THREE.Vector3(1.52, -0.84, z), 0.028, material));
  return group;
}

function addPanelLines(root, material) {
  [
    [[-2.6, 0.3, 0.12], [-1.6, 0.48, 0.18], [-0.2, 0.54, 0.2], [1.55, 0.46, 0.16], [2.42, 0.27, 0.08]],
    [[-2.6, 0.3, -0.12], [-1.6, 0.48, -0.18], [-0.2, 0.54, -0.2], [1.55, 0.46, -0.16], [2.42, 0.27, -0.08]],
    [[0.3, 0.08, 0.52], [-0.62, 0.12, 1.7], [-1.2, 0.14, 3.18]],
    [[0.3, 0.08, -0.52], [-0.62, 0.12, -1.7], [-1.2, 0.14, -3.18]]
  ].forEach((points) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    root.add(new THREE.Line(geometry, material));
  });
}

function addHatches(root, mat) {
  [
    [0.45, 0.56, 0.2, 0.4, 0.035, 0.2],
    [-0.78, 0.18, 1.15, 0.34, 0.045, 0.2],
    [-0.78, 0.18, -1.15, 0.34, 0.045, 0.2],
    [-2.6, 0.58, 0.18, 0.3, 0.045, 0.18],
    [-2.6, 0.58, -0.18, 0.3, 0.045, 0.18]
  ].forEach(([x, y, z, sx, sy, sz]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat.metal);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 18), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addEnvironment(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd4dc, 2.1));

  const key = new THREE.DirectionalLight(0xffffff, 3.6);
  key.position.set(5, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdbeafe, 1.2);
  fill.position.set(-4, 2.4, -5);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({ color: 0x8a96a4, opacity: 0.13 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.16;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(12, 12, 0xcdd6df, 0xe1e7ee);
  grid.position.y = -1.15;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  scene.add(grid);
}

function createCarbonTexture() {
  const size = 96;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#08090a";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#272a2e";
  ctx.lineWidth = 5;
  for (let i = -size; i < size * 2; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  ctx.strokeStyle = "#111315";
  for (let i = -size; i < size * 2; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i + size, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bindControls({ controlsRoot, controls, camera, target, status, compact }) {
  if (!controlsRoot) return;
  const views = {
    iso: [compact ? 6.8 : 9.2, compact ? 4.5 : 5.2, compact ? 8.0 : 9.8],
    top: [0.02, compact ? 12.0 : 10.5, 0.02],
    side: [compact ? 7.0 : 10.2, compact ? 1.55 : 1.9, 0.02],
    front: [compact ? 6.2 : 8.4, compact ? 1.7 : 2.05, 0],
    rear: [compact ? -6.2 : -8.4, compact ? 1.7 : 2.05, 0]
  };

  controlsRoot.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      controls.autoRotate = false;
      const next = views[button.dataset.view] || views.iso;
      camera.position.set(...next);
      controls.target.copy(target);
      controls.update();
      if (status) status.textContent = `${button.textContent} view`;
    });
  });

  controlsRoot.querySelector("[data-spin-toggle]")?.addEventListener("click", (event) => {
    controls.autoRotate = !controls.autoRotate;
    event.currentTarget.textContent = controls.autoRotate ? "Spin" : "Still";
    if (status) status.textContent = controls.autoRotate ? "Auto spin" : "Manual view";
  });
}
