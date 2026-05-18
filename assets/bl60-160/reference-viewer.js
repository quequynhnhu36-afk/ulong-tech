import * as THREE from "three";

const FRAMES = {
  iso: "11",
  top: "01",
  side: "09",
  front: "25",
  rear: "28"
};

const SPIN_SEQUENCE = ["02", "03", "08", "11", "05", "01", "06", "07", "12", "20", "22", "28", "25", "27"];

export function initBL60ReferenceViewer({ canvas, status, controlsRoot }) {
  if (!canvas) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef3f7);

  const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100);
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), material);
  scene.add(plane);

  let disposed = false;
  let frame = 0;
  let activeKey = "iso";
  let spin = true;
  let spinIndex = 0;
  let lastSwap = 0;

  function frameUrl(stem) {
    return `/assets/bl60-160/previews/${stem}.jpg`;
  }

  function loadFrame(stem) {
    if (cache.has(stem)) return Promise.resolve(cache.get(stem));
    return new Promise((resolve, reject) => {
      loader.load(
        frameUrl(stem),
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
          cache.set(stem, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  async function showFrame(stem, label = "Reference view") {
    try {
      const texture = await loadFrame(stem);
      if (disposed) return;
      material.map = texture;
      material.needsUpdate = true;
      if (status) status.textContent = label;
    } catch {
      if (status) status.textContent = "Reference image unavailable";
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const aspect = width / height;
    const frameAspect = 16 / 9;
    if (aspect >= frameAspect) {
      camera.top = 4.5;
      camera.bottom = -4.5;
      camera.right = 4.5 * aspect;
      camera.left = -4.5 * aspect;
    } else {
      camera.right = 8;
      camera.left = -8;
      camera.top = 8 / aspect;
      camera.bottom = -8 / aspect;
    }
    plane.scale.setScalar(aspect < 1.25 ? 0.82 : 0.9);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function bindControls() {
    if (!controlsRoot) return;
    controlsRoot.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        activeKey = button.dataset.view || "iso";
        spin = false;
        const stem = FRAMES[activeKey] || FRAMES.iso;
        showFrame(stem, `${button.textContent} reference`);
      });
    });

    controlsRoot.querySelector("[data-spin-toggle]")?.addEventListener("click", (event) => {
      spin = !spin;
      event.currentTarget.textContent = spin ? "Spin" : "Still";
      if (status) status.textContent = spin ? "Reference animation" : "Manual reference";
    });
  }

  function animate(now = 0) {
    if (spin && now - lastSwap > 780) {
      spinIndex = (spinIndex + 1) % SPIN_SEQUENCE.length;
      showFrame(SPIN_SEQUENCE[spinIndex], "Reference animation");
      lastSwap = now;
    }
    plane.rotation.y = Math.sin(now * 0.0008) * 0.018;
    plane.rotation.x = Math.cos(now * 0.0006) * 0.01;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  resize();
  bindControls();
  showFrame(FRAMES[activeKey], "Reference animation ready");
  SPIN_SEQUENCE.forEach((stem) => loadFrame(stem).catch(() => {}));
  window.addEventListener("resize", resize);
  animate();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      cache.forEach((texture) => texture.dispose());
      material.dispose();
      renderer.dispose();
    }
  };
}
