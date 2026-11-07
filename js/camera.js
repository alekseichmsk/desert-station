import * as THREE from "three";
import { WORLD } from "./state.js";

function sphericalOffset(radius, polar, azimuth, out) {
  const sp = Math.sin(polar);
  out.set(
    radius * sp * Math.sin(azimuth),
    radius * Math.cos(polar),
    radius * sp * Math.cos(azimuth),
  );
  return out;
}

export function createView(canvas) {
  const cfg = WORLD.camera;
  const target = new THREE.Vector3(WORLD.target.x, WORLD.target.y, WORLD.target.z);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, cfg.near, cfg.far);
  const initial = {
    radius: cfg.radius,
    polar: cfg.polar,
    azimuth: cfg.azimuth,
    zoom: cfg.zoom,
    viewHeight: cfg.viewHeight,
  };
  const current = { ...initial };
  const goal = { ...initial };
  const offset = new THREE.Vector3();
  let aspect = 1;

  const pointers = new Map();
  let pinch = null;

  function clampGoal() {
    goal.polar = THREE.MathUtils.clamp(goal.polar, cfg.minPolar, cfg.maxPolar);
    goal.zoom = THREE.MathUtils.clamp(goal.zoom, cfg.minZoom, cfg.maxZoom);
  }

  function applyFrustum() {
    const half = current.viewHeight / 2;
    camera.top = half;
    camera.bottom = -half;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.zoom = current.zoom;
    camera.near = cfg.near;
    camera.far = cfg.far;
    camera.updateProjectionMatrix();
  }

  function apply() {
    sphericalOffset(current.radius, current.polar, current.azimuth, offset);
    camera.position.copy(target).add(offset);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    applyFrustum();
  }

  function resize(width, height) {
    aspect = Math.max(width, 1) / Math.max(height, 1);
    applyFrustum();
  }

  function update(dt) {
    const k = 1 - Math.exp(-14 * Math.max(dt, 0));
    current.radius += (goal.radius - current.radius) * k;
    current.polar += (goal.polar - current.polar) * k;
    current.azimuth += (goal.azimuth - current.azimuth) * k;
    current.zoom += (goal.zoom - current.zoom) * k;
    apply();
  }

  function reset() {
    goal.radius = initial.radius;
    goal.polar = initial.polar;
    goal.azimuth = initial.azimuth;
    goal.zoom = initial.zoom;
  }

  function snap(partial) {
    if (partial.targetX != null) target.x = partial.targetX;
    if (partial.targetY != null) target.y = partial.targetY;
    if (partial.targetZ != null) target.z = partial.targetZ;
    if (partial.radius != null) current.radius = goal.radius = partial.radius;
    if (partial.polar != null) current.polar = goal.polar = partial.polar;
    if (partial.azimuth != null) current.azimuth = goal.azimuth = partial.azimuth;
    if (partial.zoom != null) current.zoom = goal.zoom = partial.zoom;
    if (partial.viewHeight != null) current.viewHeight = partial.viewHeight;
    clampGoal();
    current.polar = goal.polar;
    current.zoom = goal.zoom;
    apply();
  }

  function rememberAsInitial() {
    initial.radius = current.radius;
    initial.polar = current.polar;
    initial.azimuth = current.azimuth;
    initial.zoom = current.zoom;
    initial.viewHeight = current.viewHeight;
  }

  function onWheel(event) {
    event.preventDefault();
    let dy = event.deltaY;
    if (event.deltaMode === 1) dy *= 16;
    else if (event.deltaMode === 2) dy *= 120;
    goal.zoom *= Math.exp(-dy * 0.00115);
    clampGoal();
  }

  function pointerDistance() {
    const pts = [...pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function onPointerDown(event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    pinch = pointers.size === 2 ? pointerDistance() : null;
  }

  function onPointerMove(event) {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    const x = event.clientX;
    const y = event.clientY;
    if (pointers.size === 1) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      goal.azimuth -= dx * 0.0051;
      goal.polar -= dy * 0.0031;
      clampGoal();
    }
    prev.x = x;
    prev.y = y;
    if (pointers.size >= 2 && pinch) {
      const dist = pointerDistance();
      if (pinch > 0) {
        goal.zoom *= dist / pinch;
        clampGoal();
      }
      pinch = dist;
    }
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);
    pinch = pointers.size >= 2 ? pointerDistance() : null;
  }

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (event.key === "ArrowLeft") goal.azimuth += 0.07;
    else if (event.key === "ArrowRight") goal.azimuth -= 0.07;
    else if (event.key === "ArrowUp") goal.polar = Math.min(cfg.maxPolar, goal.polar + 0.045);
    else if (event.key === "ArrowDown") goal.polar = Math.max(cfg.minPolar, goal.polar - 0.045);
    else if (event.key === "+" || event.key === "=") goal.zoom *= 1.08;
    else if (event.key === "-" || event.key === "_") goal.zoom /= 1.08;
    else if (event.key === "r" || event.key === "R" || event.key === "к" || event.key === "К") reset();
    else return;
    clampGoal();
    event.preventDefault();
  });

  apply();

  return {
    camera,
    target,
    update,
    resize,
    reset,
    snap,
    rememberAsInitial,
    info() {
      return {
        azimuth: current.azimuth,
        polar: current.polar,
        zoom: current.zoom,
        viewHeight: current.viewHeight,
        radius: current.radius,
        target: { x: target.x, y: target.y, z: target.z },
      };
    },
  };
}
