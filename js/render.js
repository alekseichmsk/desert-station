import * as THREE from "three";

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x243044, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return renderer;
}

export function startLoop({ renderer, scene, camera, view, traffic, onFrame }) {
  const clock = new THREE.Clock();
  let running = true;

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) clock.getDelta();
  });

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (running) {
      view.update(dt);
      traffic.update(dt);
      renderer.render(scene, camera);
      onFrame(dt);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function resizeToWindow(renderer, view) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  view.resize(width, height);
}
