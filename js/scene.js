import * as THREE from "three";
import { PALETTE, WORLD, runtime } from "./state.js";

function lambert(color) {
  const material = new THREE.MeshLambertMaterial({ color });
  material.dithering = true;
  return material;
}

function basic(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2 - 0.05, h / 2 - 0.05);
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - radius);
  shape.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + h);
  shape.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function groundPlane(w, h) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function hillHeight(angle) {
  return 0.85
    + Math.sin(angle * 2.0) * 0.28
    + Math.sin(angle * 5.0 + 0.6) * 0.14
    + Math.sin(angle * 13.0 + 1.1) * 0.06;
}

function makeGround() {
  const azimuth = WORLD.camera.azimuth;
  const rightX = Math.cos(azimuth);
  const rightZ = -Math.sin(azimuth);
  const farX = -Math.sin(azimuth);
  const farZ = -Math.cos(azimuth);
  const far = 43.5;
  const near = 420;
  const halfW = 220;
  const corner = (along, side) => [
    farX * along + rightX * side,
    farZ * along + rightZ * side,
  ];
  const ox = WORLD.target.x;
  const oz = WORLD.target.z;
  const c0 = corner(far, halfW);
  const c1 = corner(far, -halfW);
  const c2 = corner(-near, -halfW);
  const c3 = corner(-near, halfW);
  const positions = [];
  for (const [x, z] of [c0, c1, c2, c0, c2, c3]) positions.push(x + ox, 0, z + oz);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const normals = [];
  for (let i = 0; i < 6; i += 1) normals.push(0, 1, 0);
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function makeHills() {
  const azimuth = WORLD.camera.azimuth;
  const farX = -Math.sin(azimuth);
  const farZ = -Math.cos(azimuth);
  const rightX = Math.cos(azimuth);
  const rightZ = -Math.sin(azimuth);
  const far = 43.5;
  const halfW = 170;
  const segments = 80;
  const positions = [];
  const colors = [];
  const bottom = new THREE.Color(PALETTE.hillBottom);
  const top = new THREE.Color(PALETTE.hillTop);
  for (let i = 0; i < segments; i += 1) {
    const t0 = -1 + (2 * i) / segments;
    const t1 = -1 + (2 * (i + 1)) / segments;
    const wobble0 = hillHeight(t0 * 6);
    const wobble1 = hillHeight(t1 * 6);
    const ox = WORLD.target.x;
    const oz = WORLD.target.z;
    const x0 = ox + farX * far + rightX * halfW * t0;
    const z0 = oz + farZ * far + rightZ * halfW * t0;
    const x1 = ox + farX * far + rightX * halfW * t1;
    const z1 = oz + farZ * far + rightZ * halfW * t1;
    const verts = [
      [x0, 0, z0, bottom],
      [x0, wobble0, z0, top],
      [x1, wobble1, z1, top],
      [x0, 0, z0, bottom],
      [x1, wobble1, z1, top],
      [x1, 0, z1, bottom],
    ];
    for (const [x, y, z, color] of verts) {
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }),
  );
  mesh.name = "hills";
  return mesh;
}

function makeBushes() {
  let seed = 836965;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const apron = WORLD.apron;
  const spots = [];
  let guard = 0;
  while (spots.length < 46 && guard < 800) {
    guard += 1;
    const x = (rand() * 2 - 1) * 95;
    const z = -55 + rand() * 95;
    if (Math.abs(z) < WORLD.roadWidth * 0.62 && Math.abs(x) < WORLD.roadLength * 0.5) continue;
    const dx = (x - apron.x) / (apron.w * 0.48);
    const dz = (z - apron.z) / (apron.d * 0.48);
    if (dx * dx + dz * dz < 1) continue;
    spots.push({ x, z, s: 0.45 + rand() * 0.7, yaw: rand() * Math.PI });
  }
  const geo = new THREE.SphereGeometry(0.22, 5, 4);
  const mesh = new THREE.InstancedMesh(geo, lambert(PALETTE.bush), spots.length);
  const dummy = new THREE.Object3D();
  spots.forEach((spot, index) => {
    dummy.position.set(spot.x, 0.12 * spot.s, spot.z);
    dummy.rotation.y = spot.yaw;
    dummy.scale.set(spot.s, spot.s * 0.72, spot.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "bushes";
  return mesh;
}

function makePoles() {
  const group = new THREE.Group();
  group.name = "poles";
  const wood = basic(PALETTE.pole);
  const wireMat = basic(PALETTE.wire);
  const xs = WORLD.pole.xs;
  const height = WORLD.pole.height;
  const anchors = [[-0.95, height - 0.05], [0, height - 0.02], [0.95, height - 0.05]];

  xs.forEach((x) => {
    const pole = new THREE.Group();
    pole.position.set(x, 0, WORLD.pole.z);
    const post = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.045, height, 0.045), wood));
    post.position.y = height / 2;
    const arm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.25), wood));
    arm.position.y = height - 0.02;
    pole.add(post, arm);
    group.add(pole);
  });

  for (let i = 0; i < xs.length - 1; i += 1) {
    for (const [zOff, y] of anchors) {
      const start = new THREE.Vector3(xs[i], y, WORLD.pole.z + zOff);
      const end = new THREE.Vector3(xs[i + 1], y, WORLD.pole.z + zOff);
      const mid = start.clone().lerp(end, 0.5);
      mid.y -= 0.42;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.012, 3, false), wireMat);
      tube.castShadow = true;
      group.add(tube);
    }
  }
  return group;
}

function labelTexture(text, bg, fg, fontPx) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontPx}px sans-serif`;
  ctx.fillText(text, 256, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function metal(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const glowCache = new Map();

function glowTexture(hex) {
  const key = hex.toString(16);
  const cached = glowCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const color = `#${key.padStart(6, "0")}`;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  glowCache.set(key, texture);
  return texture;
}

function addStripHalo(parent, length, height, x, y, z) {
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(length, height),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ float across = abs(vUv.y - 0.5) * 2.0; float alpha = pow(1.0 - smoothstep(0.0, 1.0, across), 1.7); float ends = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x); alpha *= ends * 0.62; if (alpha < 0.01) discard; gl_FragColor = vec4(1.0, 0.16, 0.07, alpha); }",
    }),
  );
  halo.position.set(x, y, z);
  halo.renderOrder = 2;
  halo.frustumCulled = false;
  parent.add(halo);
  return halo;
}

function addHazeColumn(parent, name, x, topY, z) {
  const column = new THREE.Group();
  column.name = name;
  const map = glowTexture(0xffe2b8);
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map,
      color: 0xffe2b8,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: 0.2 * (1 - t * 0.82),
    }));
    sprite.position.set(x, topY - 0.25 - t * 1.7, z);
    const size = 0.42 + t * 1.15;
    sprite.scale.set(size, size * 0.7, 1);
    column.add(sprite);
  }
  parent.add(column);
  return column;
}

function addGlow(parent, color, size, x, y, z) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(color),
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    opacity: 0.5,
  }));
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 2;
  parent.add(sprite);
  return sprite;
}

function put(parent, name, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makePump(spec, id) {
  const pump = new THREE.Group();
  pump.name = `pump-${id}`;
  const cream = metal(0xe7dccb, 0.78, 0.04);
  const red = metal(0x8e342c, 0.72, 0.05);
  const steel = metal(0xb7b3ac, 0.4, 0.48);
  const rubber = metal(0x1a1a1a, 0.9, 0.02);
  const concrete = metal(0x8a8681, 0.96, 0);

  const islandH = 0.12;
  const bodyW = 0.46;
  const bodyD = 0.3;
  const bodyH = 1.22;
  const bodyBottom = islandH;
  const bodyTop = bodyBottom + bodyH;
  const capH = 0.07;

  put(pump, `pump-${id}-island`, new THREE.BoxGeometry(1.42, islandH, 0.82), concrete, 0, islandH / 2, 0);
  put(
    pump,
    `pump-${id}-body`,
    new THREE.BoxGeometry(bodyW, bodyH, bodyD),
    cream,
    0,
    bodyBottom + bodyH / 2,
    0,
  );
  put(pump, `pump-${id}-band`, new THREE.BoxGeometry(bodyW + 0.02, 0.13, bodyD + 0.02), red, 0, 1.02, 0);
  put(
    pump,
    `pump-${id}-cap`,
    new THREE.BoxGeometry(bodyW + 0.04, capH, bodyD + 0.04),
    steel,
    0,
    bodyTop + capH / 2,
    0,
  );

  const faceZ = bodyD / 2;
  put(pump, `pump-${id}-bezel`, new THREE.BoxGeometry(0.3, 0.16, 0.02), metal(0x161311, 0.55, 0.25), 0, 1.16, faceZ - 0.004);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.11),
    new THREE.MeshStandardMaterial({
      map: spec.texture,
      emissive: 0xffc56a,
      emissiveMap: spec.texture,
      emissiveIntensity: 0.65,
      roughness: 0.45,
    }),
  );
  screen.name = `pump-${id}-screen`;
  screen.position.set(0, 1.16, faceZ + 0.012);
  pump.add(screen);

  ["87", "89", "93"].forEach((label, index) => {
    const tex = labelTexture(label, "#241c16", index === spec.grade ? "#f0d7a4" : "#b7aea2", 118);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, 0.065),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.04 }),
    );
    plaque.position.set(-0.12 + index * 0.12, 0.96, faceZ + 0.008);
    pump.add(plaque);
  });

  for (let i = 0; i < 6; i += 1) {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 8), i % 2 ? red : steel);
    button.rotation.x = Math.PI / 2;
    button.position.set(-0.09 + (i % 3) * 0.09, 0.82 - Math.floor(i / 3) * 0.055, faceZ + 0.004);
    pump.add(button);
  }

  const outlet = new THREE.Object3D();
  outlet.name = `pump-${id}-outlet`;
  outlet.position.set(bodyW / 2, 1.16, 0.02);
  pump.add(outlet);
  put(pump, `pump-${id}-nipple`, new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), steel, bodyW / 2 + 0.01, 1.16, 0.02).rotation.z = Math.PI / 2;

  const grip = new THREE.Vector3(bodyW / 2 + 0.07, 0.98, 0.04);
  put(pump, `pump-${id}-nozzle`, new THREE.BoxGeometry(0.045, 0.2, 0.05), rubber, grip.x, 1.05, grip.z);
  put(pump, `pump-${id}-spout`, new THREE.BoxGeometry(0.03, 0.045, 0.08), rubber, grip.x, 1.16, grip.z + 0.04);
  put(pump, `pump-${id}-holster`, new THREE.BoxGeometry(0.05, 0.26, 0.08), steel, bodyW / 2 + 0.01, 1.02, 0.0);

  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        outlet.position.clone(),
        new THREE.Vector3(0.48, 1.05, 0.16),
        new THREE.Vector3(0.55, 0.48, 0.22),
        new THREE.Vector3(0.4, 0.62, 0.1),
        grip.clone(),
      ]),
      28,
      0.016,
      6,
      false,
    ),
    rubber,
  );
  hose.name = `pump-${id}-hose`;
  hose.castShadow = true;
  hose.userData.grip = grip.clone();
  pump.add(hose);
  pump.position.set(spec.lx, 0, spec.lz);
  return pump;
}

function makeShop(spec) {
  const shop = new THREE.Group();
  shop.name = "shop";
  shop.position.set(spec.x, 0, spec.z);

  const W = spec.w;
  const D = spec.d;
  const H = spec.h;
  const T = spec.wall;
  const wallMat = metal(0xd5cbbd, 0.94, 0.02);
  const roofMat = metal(0x8d8882, 0.97, 0.0);
  const trim = metal(0x2a2624, 0.62, 0.28);
  const steel = metal(0xc5c0b8, 0.35, 0.55);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xc5e0e6,
    roughness: 0.06,
    metalness: 0.42,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  glassMat.polygonOffset = true;
  glassMat.polygonOffsetFactor = -1;
  glassMat.polygonOffsetUnits = -1;

  const frontOuter = D / 2;
  const frontCenter = frontOuter - T / 2;
  const innerL = -W / 2 + T;
  const innerR = W / 2 - T;
  const winX0 = -2.45;
  const winX1 = 0.15;
  const winY0 = 0.92;
  const winY1 = 2.26;
  const doorX0 = 0.52;
  const doorX1 = 1.68;
  const doorTop = 2.18;

  put(shop, "shop-wall-back", new THREE.BoxGeometry(W - T * 2, H, T), wallMat, 0, H / 2, -frontCenter);
  put(shop, "shop-wall-left", new THREE.BoxGeometry(T, H, D), wallMat, -W / 2 + T / 2, H / 2, 0);
  put(shop, "shop-wall-right", new THREE.BoxGeometry(T, H, D), wallMat, W / 2 - T / 2, H / 2, 0);

  const facade = (name, w, h, x, y) => put(
    shop,
    name,
    new THREE.BoxGeometry(w, h, T),
    wallMat,
    x,
    y,
    frontCenter,
  );
  facade("shop-pier-left", winX0 - innerL, H, (innerL + winX0) / 2, H / 2);
  facade("shop-sill", winX1 - winX0, winY0, (winX0 + winX1) / 2, winY0 / 2);
  facade("shop-lintel", winX1 - winX0, H - winY1, (winX0 + winX1) / 2, (winY1 + H) / 2);
  facade("shop-pier-mid", doorX0 - winX1, H, (winX1 + doorX0) / 2, H / 2);
  facade("shop-door-head", doorX1 - doorX0, H - doorTop, (doorX0 + doorX1) / 2, (doorTop + H) / 2);
  facade("shop-pier-right", innerR - doorX1, H, (doorX1 + innerR) / 2, H / 2);

  const ledge = put(
    shop,
    "shop-ledge",
    new THREE.BoxGeometry(winX1 - winX0 + 0.04, 0.04, 0.08),
    trim,
    (winX0 + winX1) / 2,
    winY0 + 0.01,
    frontOuter + 0.02,
  );
  ledge.castShadow = true;

  const casing = (w, h, x, y) => {
    const bar = put(shop, "", new THREE.BoxGeometry(w, h, 0.035), trim, x, y, frontOuter + 0.012);
    bar.castShadow = true;
  };
  casing(winX1 - winX0 + 0.06, 0.045, (winX0 + winX1) / 2, winY1);
  casing(winX1 - winX0 + 0.06, 0.045, (winX0 + winX1) / 2, winY0);
  casing(0.045, winY1 - winY0, winX0, (winY0 + winY1) / 2);
  casing(0.045, winY1 - winY0, winX1, (winY0 + winY1) / 2);
  casing(0.04, winY1 - winY0, (winX0 + winX1) / 2, (winY0 + winY1) / 2);
  casing(doorX1 - doorX0 + 0.06, 0.045, (doorX0 + doorX1) / 2, doorTop);
  casing(0.045, doorTop, doorX0, doorTop / 2);
  casing(0.045, doorTop, doorX1, doorTop / 2);

  const glass = put(
    shop,
    "shop-glass",
    new THREE.PlaneGeometry(winX1 - winX0 - 0.08, winY1 - winY0 - 0.08),
    glassMat,
    (winX0 + winX1) / 2,
    (winY0 + winY1) / 2,
    frontCenter - 0.01,
  );
  glass.castShadow = false;

  put(
    shop,
    "shop-threshold",
    new THREE.BoxGeometry(doorX1 - doorX0, 0.04, 0.22),
    metal(0x6d655c, 0.9, 0.04),
    (doorX0 + doorX1) / 2,
    0.02,
    frontCenter,
  );

  const door = new THREE.Group();
  door.name = "shop-door";
  door.position.set(doorX0, 0, frontCenter);
  const dw = doorX1 - doorX0 - 0.06;
  const dh = doorTop - 0.055;
  const doorBottom = 0.048;
  const stile = 0.07;
  const doorMat = metal(0xcfc4b4, 0.78, 0.06);
  put(door, "shop-door-stile", new THREE.BoxGeometry(stile, dh, 0.04), doorMat, stile / 2, doorBottom + dh / 2, 0);
  put(door, "shop-door-stile-r", new THREE.BoxGeometry(stile, dh, 0.04), doorMat, dw - stile / 2, doorBottom + dh / 2, 0);
  put(door, "shop-door-rail-b", new THREE.BoxGeometry(dw, 0.08, 0.04), doorMat, dw / 2, doorBottom + 0.04, 0);
  put(door, "shop-door-rail-m", new THREE.BoxGeometry(dw, 0.07, 0.04), doorMat, dw / 2, 0.98, 0);
  put(door, "shop-door-rail-t", new THREE.BoxGeometry(dw, 0.07, 0.04), doorMat, dw / 2, doorBottom + dh - 0.035, 0);
  put(
    door,
    "shop-door-panel",
    new THREE.BoxGeometry(dw - stile * 2, 0.8, 0.03),
    metal(0xb7aa98, 0.84, 0.04),
    dw / 2,
    0.55,
    0,
  );
  const doorGlass = put(
    door,
    "shop-door-glass",
    new THREE.PlaneGeometry(dw - stile * 2 - 0.02, 1.02),
    glassMat,
    dw / 2,
    1.55,
    0.012,
  );
  doorGlass.castShadow = false;
  const handle = put(door, "shop-door-handle", new THREE.BoxGeometry(0.02, 0.16, 0.035), steel, dw - 0.05, 1.05, 0.035);
  handle.castShadow = true;
  [0.35, 1.05, 1.85].forEach((y) => {
    const hinge = put(door, "shop-hinge", new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), steel, 0, y, 0);
    hinge.rotation.x = Math.PI / 2;
  });
  shop.add(door);

  put(
    shop,
    "shop-roof",
    new THREE.BoxGeometry(W + 0.22, spec.roof, D + 0.22),
    roofMat,
    0,
    H + spec.roof / 2,
    0,
  );
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0xff5a42,
    emissive: 0xff341f,
    emissiveIntensity: 1.35,
    roughness: 0.4,
  });
  const neon = put(shop, "shop-neon", new THREE.BoxGeometry(W + 0.02, 0.03, 0.03), neonMat, 0, H - 0.08, frontOuter + 0.02);
  neon.castShadow = false;
  addStripHalo(shop, W + 0.2, 0.95, 0, H - 0.08, frontOuter + 0.08);

  const floor = put(
    shop,
    "shop-floor",
    new THREE.BoxGeometry(W - T * 2 - 0.04, 0.06, D - T * 2 - 0.28),
    metal(0x6a5344, 0.9, 0),
    0,
    0.03,
    -0.1,
  );
  floor.castShadow = false;

  const wood = metal(0x6d513c, 0.8, 0.03);
  const shelfZ = frontCenter - T - 0.22;
  const shelfX = (winX0 + winX1) / 2;
  const colors = [0xb94a3c, 0xd7b15a, 0x3e6b52, 0xded6c8, 0x3d6296, 0xc46b3a];
  for (let row = 0; row < 2; row += 1) {
    const shelfY = 1.08 + row * 0.46;
    put(shop, "shop-shelf", new THREE.BoxGeometry(winX1 - winX0 - 0.2, 0.03, 0.24), wood, shelfX, shelfY, shelfZ);
    for (let i = 0; i < 6; i += 1) {
      const color = colors[(i + row) % colors.length];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02 });
      const bottle = i % 2 === 0;
      const height = bottle ? 0.16 + (i % 3) * 0.035 : 0.11;
      const geo = bottle
        ? new THREE.CylinderGeometry(0.032, 0.038, height, 8)
        : new THREE.BoxGeometry(0.08, height, 0.06);
      put(shop, "shop-goods", geo, mat, winX0 + 0.28 + i * 0.38, shelfY + 0.015 + height / 2, shelfZ);
    }
  }

  const counter = put(shop, "shop-counter", new THREE.BoxGeometry(1.15, 0.92, 0.48), wood, 1.55, 0.52, 0.35);
  counter.castShadow = true;
  put(shop, "shop-register", new THREE.BoxGeometry(0.28, 0.14, 0.22), metal(0x242220, 0.5, 0.2), 1.45, 1.05, 0.4);

  const lamp = put(
    shop,
    "shop-lamp",
    new THREE.BoxGeometry(0.85, 0.05, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e4, emissive: 0xffe0b0, emissiveIntensity: 1.8, roughness: 0.4 }),
    shelfX,
    H - 0.04,
    0.15,
  );
  lamp.castShadow = false;

  const ac = put(shop, "shop-ac", new THREE.BoxGeometry(0.7, 0.32, 0.46), metal(0xb7b8b4, 0.55, 0.28), 1.4, H + spec.roof + 0.16, -0.4);
  ac.castShadow = true;
  return shop;
}

function makeCanopy(spec, pumps) {
  const canopy = new THREE.Group();
  canopy.name = "canopy";
  canopy.position.set(spec.x, 0, spec.z);
  const deckMat = metal(0x9a958f, 0.97, 0);
  const fasciaMat = metal(0x8d4638, 0.92, 0.02);
  const soffitY = spec.top - spec.fascia;
  const deckBottom = spec.top - spec.deck;

  put(canopy, "canopy-deck", new THREE.BoxGeometry(spec.w, spec.deck, spec.d), deckMat, 0, spec.top - spec.deck / 2, 0);
  const skirtH = deckBottom - soffitY;
  const skirtY = soffitY + skirtH / 2;
  const skirtT = 0.1;
  put(canopy, "canopy-fascia-front", new THREE.BoxGeometry(spec.w, skirtH, skirtT), fasciaMat, 0, skirtY, spec.d / 2 - skirtT / 2);
  put(canopy, "canopy-fascia-back", new THREE.BoxGeometry(spec.w, skirtH, skirtT), fasciaMat, 0, skirtY, -spec.d / 2 + skirtT / 2);
  put(canopy, "canopy-fascia-side", new THREE.BoxGeometry(skirtT, skirtH, spec.d - skirtT * 2), fasciaMat, spec.w / 2 - skirtT / 2, skirtY, 0);
  put(canopy, "canopy-fascia-side", new THREE.BoxGeometry(skirtT, skirtH, spec.d - skirtT * 2), fasciaMat, -spec.w / 2 + skirtT / 2, skirtY, 0);
  put(
    canopy,
    "canopy-soffit",
    new THREE.BoxGeometry(spec.w - 0.24, 0.03, spec.d - 0.24),
    metal(0xd4cfc4, 0.92, 0),
    0,
    soffitY - 0.015,
    0,
  );

  const columnMat = metal(0xd9d3c8, 0.82, 0.05);
  [[-3.15, -1.85], [3.15, -1.85], [-3.15, 1.85], [3.15, 1.85]].forEach(([x, z], index) => {
    put(canopy, `canopy-column-${index}`, new THREE.BoxGeometry(0.16, soffitY, 0.16), columnMat, x, soffitY / 2, z);
    put(canopy, `canopy-capital-${index}`, new THREE.BoxGeometry(0.3, 0.04, 0.3), metal(0xb7b1a8, 0.7, 0.15), x, soffitY - 0.02, z);
    put(canopy, `canopy-base-${index}`, new THREE.BoxGeometry(0.28, 0.05, 0.28), metal(0x8a8682, 0.92, 0.02), x, 0.025, z);
  });

  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xf7f4ea,
    emissive: 0xf3efe2,
    emissiveIntensity: 1.2,
    roughness: 0.35,
  });
  const poolCanvas = document.createElement("canvas");
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const poolCtx = poolCanvas.getContext("2d");
  const poolGrad = poolCtx.createRadialGradient(64, 64, 6, 64, 64, 64);
  poolGrad.addColorStop(0, "rgba(255, 196, 120, 0.5)");
  poolGrad.addColorStop(1, "rgba(255, 206, 140, 0)");
  poolCtx.fillStyle = poolGrad;
  poolCtx.fillRect(0, 0, 128, 128);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [-0.75, 0.8].forEach((z, index) => {
    put(canopy, `canopy-housing-${index}`, new THREE.BoxGeometry(spec.w * 0.62, 0.06, 0.22), metal(0xe6e1d6, 0.7, 0.08), 0, soffitY - 0.045, z);
    const tube = put(canopy, `canopy-tube-${index}`, new THREE.CylinderGeometry(0.02, 0.02, spec.w * 0.55, 12), tubeMat, 0, soffitY - 0.09, z);
    tube.rotation.z = Math.PI / 2;
    tube.castShadow = false;
    addGlow(canopy, 0xfff1d2, 0.55, 0, soffitY - 0.16, z);
    addHazeColumn(canopy, `canopy-beam-${index}`, 0, soffitY - 0.05, z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), poolMat);
    pool.name = `canopy-pool-${index}`;
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.05, z);
    canopy.add(pool);
  });

  const neon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, spec.w - 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0xff5a42, emissive: 0xff341f, emissiveIntensity: 1.25, roughness: 0.45 }),
  );
  neon.rotation.z = Math.PI / 2;
  neon.castShadow = false;
  neon.position.set(0, soffitY + 0.035, spec.d / 2 + 0.028);
  neon.castShadow = false;
  canopy.add(neon);
  addStripHalo(canopy, spec.w - 0.15, 1.05, 0, soffitY + 0.03, spec.d / 2 + 0.08);

  pumps.forEach((pumpSpec, index) => {
    const price = labelTexture(pumpSpec.price, "#1a120c", "#f0c36a", 132);
    canopy.add(makePump({ ...pumpSpec, texture: price, grade: pumpSpec.grade }, index === 0 ? "a" : "b"));
  });
  return canopy;
}

function makeSign(spec) {
  const sign = new THREE.Group();
  sign.name = "sign";
  sign.position.set(spec.x, 0, spec.z);
  const pole = put(
    sign,
    "sign-pole",
    new THREE.CylinderGeometry(0.07, 0.09, spec.h, 10),
    metal(0x8e9398, 0.5, 0.35),
    0,
    spec.h / 2,
    -0.18,
  );
  pole.castShadow = true;
  put(sign, "sign-bracket", new THREE.BoxGeometry(0.08, 0.08, 0.2), metal(0x8e9398, 0.5, 0.35), 0, spec.h, -0.08);
  put(
    sign,
    "sign-board",
    new THREE.BoxGeometry(spec.w, spec.t, 0.06),
    metal(0x140c0b, 0.72, 0.04),
    0,
    spec.h + spec.t / 2,
    0,
  );
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.w - 0.16, spec.t - 0.18),
    new THREE.MeshStandardMaterial({
      map: labelTexture("GAS", "#120807", "#ff3a2a", 118),
      emissive: 0xff2e24,
      emissiveMap: labelTexture("GAS", "#120807", "#ff3a2a", 118),
      emissiveIntensity: 1.05,
      roughness: 0.5,
    }),
  );
  face.position.set(0, spec.h + spec.t / 2, 0.035);
  const backFace = face.clone();
  backFace.position.z = -0.035;
  backFace.rotation.y = Math.PI;
  sign.add(face, backFace);
  put(sign, "sign-hours-board", new THREE.BoxGeometry(spec.w * 0.78, 0.32, 0.05), metal(0x140c0b, 0.72, 0.04), 0, spec.h - 0.22, 0);
  const hours = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.w * 0.7, 0.24),
    new THREE.MeshStandardMaterial({
      map: labelTexture("24 HOURS", "#120807", "#ffb199", 56),
      emissive: 0xff6a55,
      emissiveMap: labelTexture("24 HOURS", "#120807", "#ffb199", 56),
      emissiveIntensity: 0.75,
      roughness: 0.5,
    }),
  );
  hours.position.set(0, spec.h - 0.22, 0.03);
  sign.add(hours);
  addStripHalo(sign, spec.w + 0.35, spec.t + 0.55, 0, spec.h + spec.t / 2, 0.08);
  return sign;
}

function makeStation() {
  const group = new THREE.Group();
  group.name = "station";
  const layout = WORLD.station;
  group.add(makeShop(layout.shop));
  group.add(makeCanopy(layout.canopy, layout.pumps));
  group.add(makeSign(layout.sign));

  const bollard = metal(0xd7d2c8, 0.78, 0.05);
  [[-4.4, -6.3], [2.5, -6.15], [3.5, -11.4]].forEach(([x, z]) => {
    put(group, "bollard", new THREE.CylinderGeometry(0.07, 0.08, 0.78, 8), bollard, x, 0.39, z);
    put(group, "bollard-band", new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8), metal(0x22211f, 0.7, 0.05), x, 0.58, z);
  });

  put(group, "trash", new THREE.CylinderGeometry(0.2, 0.22, 0.62, 10), metal(0x2c4638, 0.82, 0.02), 4.15, 0.31, -12.5);
  put(group, "trash-lid", new THREE.CylinderGeometry(0.23, 0.23, 0.05, 10), metal(0x24382d, 0.7, 0.05), 4.15, 0.64, -12.5);
  put(group, "air", new THREE.BoxGeometry(0.55, 0.72, 0.32), metal(0x6e7270, 0.72, 0.18), -5.35, 0.36, -6.5);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 14), metal(0x1c1c1c, 0.82, 0.02));
  coil.position.set(-5.05, 0.42, -6.35);
  coil.rotation.y = 0.4;
  group.add(coil);
  return group;
}

function makeLights(scene) {
  const ambient = new THREE.AmbientLight(PALETTE.ambient, WORLD.light.ambient);
  const sun = new THREE.DirectionalLight(PALETTE.sun, WORLD.light.intensity);
  sun.castShadow = true;
  const dir = new THREE.Vector3(WORLD.light.dir.x, WORLD.light.dir.y, WORLD.light.dir.z).normalize();
  const focus = new THREE.Vector3(WORLD.target.x, 0, WORLD.target.z);
  sun.position.copy(focus).addScaledVector(dir, -90);
  sun.target.position.copy(focus);
  const extent = WORLD.light.extent;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(WORLD.light.mapSize, WORLD.light.mapSize);
  sun.shadow.bias = WORLD.light.bias;
  sun.shadow.normalBias = WORLD.light.normalBias;
  sun.shadow.radius = WORLD.light.radius;
  sun.shadow.blurSamples = WORLD.light.blurSamples;

  const hemi = new THREE.HemisphereLight(0x243850, 0x3a2418, 0.55);
  const shop = WORLD.station.shop;
  const canopy = WORLD.station.canopy;
  const shopLight = new THREE.PointLight(0xffc48a, 9, 12, 2);
  shopLight.position.set(shop.x - 0.6, 2.05, shop.z + 0.4);
  const windowLight = new THREE.PointLight(0xffd7a4, 8, 7, 2);
  windowLight.position.set(shop.x - 1.1, 1.55, shop.z + shop.d / 2 - 0.4);
  const neonLight = new THREE.PointLight(0xff3a2a, 2.4, 10, 2);
  neonLight.position.set(shop.x, shop.h - 0.1, shop.z + shop.d / 2 + 0.4);
  const canopyFill = new THREE.PointLight(0xffc48a, 8, 14, 2);
  canopyFill.position.set(canopy.x, 1.55, canopy.z + 0.2);
  scene.add(ambient, hemi, sun, sun.target, shopLight, windowLight, neonLight, canopyFill);

  [-0.75, 0.8].forEach((lz) => {
    const spot = new THREE.SpotLight(0xffe0b0, 10, 9, 0.72, 0.85, 1.5);
    spot.position.set(canopy.x, canopy.top - canopy.fascia - 0.2, canopy.z + lz);
    spot.target.position.set(canopy.x, 0.4, canopy.z + lz);
    spot.castShadow = false;
    scene.add(spot, spot.target);
  });
  return { ambient, sun };
}

function worldBox(scene, name) {
  const obj = scene.getObjectByName(name);
  if (!obj) return null;
  return new THREE.Box3().setFromObject(obj);
}

export function auditStation(scene) {
  scene.updateMatrixWorld(true);
  const issues = [];
  const box = (name) => {
    const found = worldBox(scene, name);
    if (!found) issues.push(`missing ${name}`);
    return found;
  };
  const touch = (upperName, lowerName, gapMax, embedMax) => {
    const upper = box(upperName);
    const lower = box(lowerName);
    if (!upper || !lower) return;
    const gap = upper.min.y - lower.max.y;
    if (gap > gapMax || gap < -embedMax) issues.push(`${upperName} on ${lowerName} gap ${gap.toFixed(3)}`);
  };
  ["a", "b"].forEach((id) => {
    touch(`pump-${id}-cap`, `pump-${id}-body`, 0.012, 0.004);
    touch(`pump-${id}-body`, `pump-${id}-island`, 0.012, 0.004);
    const island = box(`pump-${id}-island`);
    if (island && (island.min.y < -0.01 || island.min.y > 0.02)) issues.push(`pump-${id} island y ${island.min.y.toFixed(3)}`);
    const outlet = scene.getObjectByName(`pump-${id}-outlet`);
    const body = box(`pump-${id}-body`);
    if (outlet && body) {
      const point = outlet.getWorldPosition(new THREE.Vector3());
      const distance = body.distanceToPoint(point);
      if (distance > 0.03) issues.push(`pump-${id} outlet off body ${distance.toFixed(3)}`);
    }
    const nozzle = box(`pump-${id}-nozzle`);
    const hose = scene.getObjectByName(`pump-${id}-hose`);
    if (!hose || hose.parent.name !== `pump-${id}`) issues.push(`pump-${id} hose not parented`);
    if (nozzle && hose && hose.userData.grip) {
      const end = hose.userData.grip.clone().applyMatrix4(hose.parent.matrixWorld);
      if (nozzle.distanceToPoint(end) > 0.04) issues.push(`pump-${id} hose end off nozzle ${nozzle.distanceToPoint(end).toFixed(3)}`);
    }
  });
  touch("shop-roof", "shop-wall-back", 0.02, 0.01);
  touch("shop-roof", "shop-wall-left", 0.02, 0.01);
  touch("shop-roof", "shop-wall-right", 0.02, 0.01);
  const door = box("shop-door");
  const threshold = box("shop-threshold");
  if (door && threshold) {
    const gap = door.min.y - threshold.max.y;
    if (gap > 0.03 || gap < -0.02) issues.push(`door/threshold gap ${gap.toFixed(3)}`);
  }
  const floor = box("shop-floor");
  if (floor && (floor.min.y < -0.01 || floor.min.y > 0.02)) issues.push(`floor y ${floor.min.y.toFixed(3)}`);
  const shop = box("shop");
  const canopy = box("canopy");
  if (shop && canopy && shop.intersectsBox(canopy)) issues.push("shop intersects canopy");
  if (door && canopy && door.intersectsBox(canopy)) issues.push("door intersects canopy");
  if (shop && door && !shop.containsBox(door)) issues.push("door outside shop shell");
  const glass = box("shop-glass");
  if (shop && glass && !shop.containsBox(glass)) issues.push("glass outside shop");
  const column = box("canopy-column-0");
  const soffit = box("canopy-soffit");
  if (column && (column.min.y < -0.01 || column.min.y > 0.02)) issues.push(`column float ${column.min.y.toFixed(3)}`);
  if (column && soffit) {
    const gap = soffit.min.y - column.max.y;
    if (gap > 0.03 || gap < -0.045) issues.push(`column/soffit gap ${gap.toFixed(3)}`);
  }
  ["shop-wall-back", "shop-wall-left", "shop-wall-right", "shop-pier-left", "shop-sill", "shop-lintel", "shop-glass", "shop-door", "canopy-deck", "canopy-beam-0"].forEach(box);
  return { ok: issues.length === 0, issues };
}

function moonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const base = ctx.createRadialGradient(96, 88, 20, 128, 128, 128);
  base.addColorStop(0, "#f4f6fb");
  base.addColorStop(0.55, "#d5dbe6");
  base.addColorStop(1, "#b7c0ce");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(92, 102, 118, 0.38)";
  [[78, 96, 30], [154, 74, 18], [118, 156, 36], [176, 148, 14], [64, 162, 11], [146, 186, 16], [100, 70, 9]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function installNight(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vDir; void main(){ float h = clamp(normalize(vDir).y, 0.0, 1.0); vec3 zenith = vec3(0.012, 0.022, 0.05); vec3 mid = vec3(0.04, 0.08, 0.12); vec3 hor = vec3(0.10, 0.16, 0.18); vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h)); col = mix(col, zenith, smoothstep(0.35, 0.85, h)); gl_FragColor = vec4(col, 1.0); }",
    }),
  );
  sky.frustumCulled = false;
  sky.name = "sky";
  scene.add(sky);

  const moonDir = new THREE.Vector3(-0.22, 0.17, -0.96).normalize();
  const moonMap = moonTexture();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 28, 18),
    new THREE.MeshStandardMaterial({
      map: moonMap,
      emissive: 0xdfe6f2,
      emissiveMap: moonMap,
      emissiveIntensity: 0.9,
      roughness: 1,
      fog: false,
    }),
  );
  moon.name = "moon";
  moon.position.copy(moonDir).multiplyScalar(155);
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(0xc5d4ee),
    color: 0xd5e2f8,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    opacity: 0.55,
  }));
  halo.position.copy(moon.position);
  halo.scale.set(22, 22, 1);
  scene.add(halo);

  const rand = (() => {
    let seed = 41;
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const starPositions = [];
  const starSeeds = [];
  for (let i = 0; i < 180; i += 1) {
    const theta = rand() * Math.PI * 2;
    const y = 0.12 + rand() * 0.88;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = 230;
    starPositions.push(Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius);
    starSeeds.push(rand());
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  starGeo.setAttribute("seed", new THREE.Float32BufferAttribute(starSeeds, 1));
  const stars = new THREE.Points(
    starGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: "attribute float seed; uniform float uTime; varying float vTw; void main(){ vTw = 0.72 + 0.28 * sin(uTime * (1.2 + seed * 2.0) + seed * 12.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (2.0 + seed * 2.2) * vTw * (480.0 / max(40.0, -mv.z)); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying float vTw; void main(){ vec2 p = gl_PointCoord - 0.5; float d = dot(p, p); if (d > 0.25) discard; float a = smoothstep(0.25, 0.02, d) * vTw; gl_FragColor = vec4(0.90, 0.94, 1.0, a); }",
    }),
  );
  stars.name = "stars";
  stars.frustumCulled = false;
  scene.add(stars);

  const meteor = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uFade: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; uniform float uFade; void main(){ float along = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.72, vUv.x); float across = 1.0 - smoothstep(0.08, 0.5, abs(vUv.y - 0.5)); float head = smoothstep(0.62, 1.0, vUv.x); vec3 col = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.96, 0.9), head); float alpha = along * across * uFade; if (alpha < 0.02) discard; gl_FragColor = vec4(col, alpha); }",
    }),
  );
  meteor.name = "meteor";
  meteor.visible = false;
  meteor.frustumCulled = false;
  scene.add(meteor);

  const flights = [
    {
      start: 3.15,
      duration: 1.05,
      from: new THREE.Vector3(-0.62, 0.34, -0.71).normalize(),
      to: new THREE.Vector3(-0.12, 0.14, -0.98).normalize(),
    },
  ];
  const state = { time: 0, visible: false, u: 0 };
  const tail = new THREE.Vector3();
  const head = new THREE.Vector3();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  const mid = new THREE.Vector3();

  function placeMeteor(camera) {
    state.visible = false;
    state.u = 0;
    meteor.visible = false;
    const flight = flights[0];
    const local = state.time - flight.start;
    if (local < 0 || local > flight.duration) return;
    const u = local / flight.duration;
    state.visible = true;
    state.u = u;
    const tailU = Math.max(0, u - 0.22);
    tail.copy(flight.from).lerp(flight.to, tailU).multiplyScalar(175);
    head.copy(flight.from).lerp(flight.to, u).multiplyScalar(175);
    mid.copy(tail).add(head).multiplyScalar(0.5);
    xAxis.copy(head).sub(tail);
    const length = Math.max(0.4, xAxis.length());
    xAxis.multiplyScalar(1 / length);
    const eye = camera ? camera.position : new THREE.Vector3(8, 4, 10);
    zAxis.copy(eye).sub(mid);
    if (zAxis.lengthSq() < 0.001) zAxis.set(0, 0, 1);
    zAxis.normalize();
    yAxis.crossVectors(zAxis, xAxis).normalize();
    zAxis.crossVectors(xAxis, yAxis).normalize();
    meteor.matrix.makeBasis(xAxis, yAxis, zAxis);
    meteor.quaternion.setFromRotationMatrix(meteor.matrix);
    meteor.position.copy(mid);
    meteor.scale.set(length, 0.7, 1);
    meteor.visible = true;
    const fade = Math.sin(Math.min(1, u / 0.18) * Math.PI * 0.5) * (1 - Math.min(1, Math.max(0, (u - 0.62) / 0.38)));
    meteor.material.uniforms.uFade.value = fade;
  }

  const night = {
    time: 0,
    update(dt, camera) {
      if (!runtime.still) night.time += dt;
      state.time = night.time;
      stars.material.uniforms.uTime.value = night.time;
      placeMeteor(camera);
    },
    seek(time, camera) {
      night.time = time;
      state.time = time;
      stars.material.uniforms.uTime.value = time;
      placeMeteor(camera);
    },
    sample() {
      return { time: night.time, meteorVisible: state.visible, meteorU: state.u };
    },
  };
  night.seek(0, null);
  return night;
}

export function buildScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, WORLD.fog.density);
  scene.userData.night = installNight(scene);

  const ground = shadow(new THREE.Mesh(makeGround(), lambert(PALETTE.sand)), false, true);
  ground.name = "sand";
  scene.add(ground);

  const parcelMatCache = new Map();
  for (const parcel of WORLD.parcels) {
    let material = parcelMatCache.get(parcel.color);
    if (!material) {
      material = lambert(parcel.color);
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
      parcelMatCache.set(parcel.color, material);
    }
    const mesh = shadow(new THREE.Mesh(groundPlane(parcel.w, parcel.d), material), false, true);
    mesh.position.set(parcel.x, 0.02, parcel.z);
    mesh.rotation.y = parcel.rot;
    scene.add(mesh);
  }

  const apron = WORLD.apron;
  const apronGeo = new THREE.ShapeGeometry(roundedRectShape(apron.w, apron.d, apron.r), 14);
  apronGeo.rotateX(-Math.PI / 2);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x2e2b28, roughness: 0.96, metalness: 0.02 });
  const apronMesh = shadow(new THREE.Mesh(apronGeo, apronMat), false, true);
  apronMesh.position.set(apron.x, 0.035, apron.z);
  apronMesh.name = "apron";
  scene.add(apronMesh);

  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.78, metalness: 0.08 });
  const road = shadow(
    new THREE.Mesh(groundPlane(WORLD.roadLength, WORLD.roadWidth), roadMat),
    false,
    true,
  );
  road.position.y = 0.055;
  road.name = "road";
  scene.add(road);
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 1 });
  const crackPaths = [
    [[-3.2, -6.4], [-2.4, -6.7], [-1.5, -6.35], [-0.4, -6.8]],
    [[0.6, -7.1], [1.4, -6.7], [2.2, -7.05], [2.9, -6.6]],
    [[-1.8, -9.6], [-0.9, -9.9], [0.1, -9.5], [0.9, -9.85]],
  ];
  crackPaths.forEach((path) => {
    const positions = [];
    const width = 0.028;
    const y = 0.048;
    for (let i = 0; i < path.length - 1; i += 1) {
      const ax = path[i][0];
      const az = path[i][1];
      const bx = path[i + 1][0];
      const bz = path[i + 1][1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const px = (-dz / len) * width;
      const pz = (dx / len) * width;
      positions.push(ax + px, y, az + pz, ax - px, y, az - pz, bx - px, y, bz - pz);
      positions.push(ax + px, y, az + pz, bx - px, y, bz - pz, bx + px, y, bz + pz);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const crack = new THREE.Mesh(geo, crackMat);
    crack.receiveShadow = true;
    scene.add(crack);
  });
  [[-2.35, -8.22], [0.85, -8.65]].forEach(([x, z]) => {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 2.15),
      new THREE.MeshStandardMaterial({ color: 0xc2b6a0, roughness: 1, metalness: 0 }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, 0.046, z);
    mark.receiveShadow = true;
    scene.add(mark);
  });

  scene.add(makeHills());
  scene.add(makeStation());
  scene.add(makePoles());
  scene.add(makeBushes());
  makeLights(scene);

  return scene;
}
