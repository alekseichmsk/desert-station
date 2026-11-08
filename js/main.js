import * as THREE from "three";
import { VERSION, runtime } from "./state.js";
import { auditStation, buildScene } from "./scene.js";
import { createTraffic } from "./traffic.js";
import { createView } from "./camera.js";
import { createRenderer, resizeToWindow, startLoop } from "./render.js";

const params = new URLSearchParams(location.search);
runtime.still = params.has("still");
runtime.clean = params.has("clean");

const errors = [];
window.addEventListener("error", (event) => {
  errors.push(String(event.message || event.error || "error"));
});
window.addEventListener("unhandledrejection", (event) => {
  errors.push(String(event.reason || "rejection"));
});

const canvas = document.getElementById("view");
const fail = document.getElementById("fail");
const hint = document.getElementById("hint");
const resetButton = document.getElementById("reset");

function showFail(message) {
  fail.hidden = false;
  fail.textContent = message;
  canvas.hidden = true;
}

if (runtime.clean) document.body.classList.add("clean");

let renderer;
try {
  renderer = createRenderer(canvas);
} catch (error) {
  showFail("Не удалось запустить WebGL в этом браузере.");
  throw error;
}

if (!renderer.getContext()) {
  showFail("Не удалось запустить WebGL в этом браузере.");
} else {
  const scene = buildScene();
  const view = createView(canvas);
  const traffic = createTraffic(scene);
  const snap = {};
  for (const key of ["azimuth", "polar", "radius", "zoom", "viewHeight", "targetX", "targetY", "targetZ"]) {
    const raw = params.get(key);
    if (raw != null && raw !== "" && !Number.isNaN(Number(raw))) snap[key] = Number(raw);
  }
  if (Object.keys(snap).length) {
    view.snap(snap);
    view.rememberAsInitial();
  }
  const projector = new THREE.Vector3();

  resetButton.addEventListener("click", () => {
    view.reset();
    resetButton.blur();
  });

  if (!runtime.clean) {
    window.setTimeout(() => hint.classList.add("show"), 650);
    const hideHint = () => hint.classList.remove("show");
    window.setTimeout(hideHint, 5200);
    canvas.addEventListener("pointerdown", hideHint, { once: true });
    window.addEventListener("keydown", hideHint, { once: true });
  }

  function onResize() {
    resizeToWindow(renderer, view);
  }
  onResize();
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);

  const app = {
    version: VERSION,
    ready: false,
    errors,
    resetCamera() {
      view.reset();
    },
    snap(partial) {
      view.snap(partial);
      renderer.render(scene, view.camera);
    },
    project(x, y, z) {
      projector.set(x, y, z).project(view.camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: (projector.x * 0.5 + 0.5) * rect.width,
        y: (-projector.y * 0.5 + 0.5) * rect.height,
      };
    },
    cars() {
      return traffic.sample();
    },
    info() {
      return view.info();
    },
    audit() {
      return auditStation(scene);
    },
    advance(seconds) {
      const was = runtime.still;
      runtime.still = false;
      traffic.update(seconds);
      runtime.still = was;
      view.update(0);
      renderer.render(scene, view.camera);
    },
  };
  window.__APP = app;

  let frames = 0;
  startLoop({
    renderer,
    scene,
    camera: view.camera,
    view,
    traffic,
    onFrame() {
      frames += 1;
      if (!app.ready) app.ready = true;
      app.frames = frames;
    },
  });
}
