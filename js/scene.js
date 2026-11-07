import * as THREE from "three";
import { PALETTE, WORLD } from "./state.js";

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
  ctx.fillText(text, 256, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function metal(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeDetailedPump(priceTexture, grade) {
  const pump = new THREE.Group();
  const cream = metal(0xe4d5c2, 0.72, 0.04);
  const red = metal(0x8d342c, 0.68, 0.06);
  const steel = metal(0xb5b1aa, 0.42, 0.45);
  const rubber = metal(0x1c1c1c, 0.86, 0.02);
  const concrete = metal(0x8d8984, 0.95, 0.0);

  addMesh(pump, new THREE.BoxGeometry(1.15, 0.08, 0.62), concrete, 0, 0.04, 0);
  addMesh(pump, new THREE.BoxGeometry(1.02, 0.05, 0.5), metal(0x6e6a66, 0.9, 0.02), 0, 0.1, 0);

  const bodyH = 1.05;
  const bodyY = 0.72;
  addMesh(pump, new THREE.BoxGeometry(0.34, bodyH, 0.18), cream, 0, bodyY, 0);
  addMesh(pump, new THREE.CylinderGeometry(0.055, 0.055, bodyH, 8), cream, -0.15, bodyY, 0);
  addMesh(pump, new THREE.CylinderGeometry(0.055, 0.055, bodyH, 8), cream, 0.15, bodyY, 0);
  addMesh(pump, new THREE.BoxGeometry(0.42, 0.12, 0.24), red, 0, 1.05, 0);
  addMesh(pump, new THREE.BoxGeometry(0.4, 0.06, 0.22), steel, 0, 1.32, 0);
  addMesh(pump, new THREE.BoxGeometry(0.3, 0.16, 0.02), metal(0x1a1614, 0.5, 0.2), 0, 1.18, 0.12);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.11),
    new THREE.MeshStandardMaterial({
      map: priceTexture,
      emissive: 0xffc56a,
      emissiveMap: priceTexture,
      emissiveIntensity: 0.7,
      roughness: 0.55,
    }),
  );
  screen.position.set(0, 1.18, 0.135);
  pump.add(screen);

  const grades = ["87", "89", "93"];
  grades.forEach((label, i) => {
    const tex = labelTexture(label, "#2a2420", i === grade ? "#f0d7a2" : "#b7aea4", 120);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, 0.07),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 }),
    );
    plaque.position.set(-0.12 + i * 0.12, 0.92, 0.115);
    pump.add(plaque);
  });

  for (let i = 0; i < 6; i += 1) {
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8),
      i % 2 ? red : steel,
    );
    button.rotation.x = Math.PI / 2;
    button.position.set(-0.1 + (i % 3) * 0.1, 0.78 - Math.floor(i / 3) * 0.06, 0.12);
    pump.add(button);
  }

  addMesh(pump, new THREE.BoxGeometry(0.1, 0.22, 0.08), steel, 0.28, 1.02, 0.02);
  addMesh(pump, new THREE.BoxGeometry(0.06, 0.16, 0.05), rubber, 0.3, 1.0, 0.06);
  addMesh(pump, new THREE.BoxGeometry(0.035, 0.05, 0.09), rubber, 0.3, 1.1, 0.1);

  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, 1.15, 0.02),
        new THREE.Vector3(0.48, 0.85, 0.12),
        new THREE.Vector3(0.55, 0.42, 0.18),
        new THREE.Vector3(0.36, 0.28, 0.08),
        new THREE.Vector3(0.3, 0.9, 0.08),
      ]),
      24,
      0.018,
      6,
      false,
    ),
    rubber,
  );
  hose.castShadow = true;
  pump.add(hose);
  return pump;
}

function addStorefront(shopGroup, shop) {
  const frameMat = metal(0x2c2826, 0.62, 0.25);
  const glass = new THREE.MeshBasicMaterial({
    color: 0xe7f3f8,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const z = -shop.d / 2 + 0.02;
  const win = { x: -1.05, y: 1.48, w: 1.55, h: 1.15 };
  const door = { x: 0.62, y: 1.12, w: 0.92, h: 2.16 };
  const pier = new THREE.Mesh(new THREE.BoxGeometry(0.16, shop.h, 0.1), metal(0xc8b8a4, 0.9, 0.02));
  pier.position.set(-0.12, shop.h / 2, z + 0.02);
  pier.castShadow = true;
  shopGroup.add(pier);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(win.w - 0.08, win.h - 0.08), glass);
  pane.position.set(win.x, win.y, z - 0.01);
  const doorPane = new THREE.Mesh(new THREE.PlaneGeometry(door.w - 0.1, door.h - 0.16), glass);
  doorPane.position.set(door.x, door.y, z - 0.01);
  shopGroup.add(pane, doorPane);

  const rim = (w, h, d, x, y) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
    bar.position.set(x, y, z);
    bar.castShadow = true;
    shopGroup.add(bar);
  };
  rim(win.w + 0.06, 0.045, 0.05, win.x, win.y + win.h / 2);
  rim(win.w + 0.06, 0.045, 0.05, win.x, win.y - win.h / 2);
  rim(0.045, win.h, 0.05, win.x - win.w / 2, win.y);
  rim(0.045, win.h, 0.05, win.x + win.w / 2, win.y);
  rim(door.w + 0.06, 0.045, 0.05, door.x, door.y + door.h / 2);
  rim(0.045, door.h, 0.05, door.x - door.w / 2, door.y);
  rim(0.045, door.h, 0.05, door.x + door.w / 2, door.y);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.03), metal(0xd9d4cc, 0.35, 0.55));
  handle.position.set(door.x + door.w * 0.32, 1.05, z - 0.03);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(door.w - 0.12, 0.32, 0.025), metal(0xe4d8c8, 0.65, 0.08));
  kick.position.set(door.x, 0.24, z - 0.025);
  const doorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(door.w - 0.2, door.h - 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffd7b0, emissive: 0xffb56a, emissiveIntensity: 0.7, roughness: 0.8 }),
  );
  doorGlow.position.set(door.x, door.y + 0.1, z + 0.55);
  shopGroup.add(handle, kick, doorGlow);

  const wood = metal(0x6a4e3b, 0.78, 0.02);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(shop.w * 0.9, 0.04, shop.d * 0.75), metal(0x5c4638, 0.86, 0));
  floor.position.set(0, 0.06, 0.1);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.42), wood);
  counter.position.set(0.7, 0.48, 0.15);
  shopGroup.add(floor, counter);

  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.05, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e4, emissive: 0xffe2b0, emissiveIntensity: 0.8, roughness: 0.4 }),
  );
  lamp.position.set(win.x, shop.h - 0.2, z + 0.35);
  shopGroup.add(lamp);

  const colors = [0xb94a3c, 0xd7b15a, 0x3e6b52, 0xded6c8, 0x3d6296, 0xc46b3a];
  for (let row = 0; row < 2; row += 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 0.22), wood);
    shelf.position.set(win.x, 0.7 + row * 0.42, z + 0.42);
    shopGroup.add(shelf);
    for (let i = 0; i < 6; i += 1) {
      const color = colors[(i + row * 2) % colors.length];
      const bottle = i % 2 === 0;
      const geo = bottle
        ? new THREE.CylinderGeometry(0.035, 0.04, 0.18 + (i % 3) * 0.04, 8)
        : new THREE.BoxGeometry(0.09, 0.11, 0.07);
      const item = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.08,
        roughness: 0.55,
      }));
      item.position.set(win.x - 0.62 + i * 0.24, 0.86 + row * 0.42, z + 0.38);
      shopGroup.add(item);
    }
  }
}

function makeStation() {
  const group = new THREE.Group();
  group.name = "station";
  const painted = metal(0xa39e96, 0.94, 0.02);
  const rust = metal(0xa85a48, 0.88, 0.04);
  const wallMat = metal(0xc8b8a4, 0.9, 0.02);
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0xff5a42,
    emissive: 0xff341f,
    emissiveIntensity: 1.6,
    roughness: 0.45,
    metalness: 0.0,
  });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xf6f3e6,
    emissive: 0xf1edd8,
    emissiveIntensity: 1.15,
    roughness: 0.4,
  });

  const canopy = WORLD.canopy;
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(canopy.x, 0, canopy.z);
  canopyGroup.rotation.y = canopy.yaw;
  const deck = addMesh(canopyGroup, new THREE.BoxGeometry(canopy.w, 0.1, canopy.d), painted, 0, canopy.top - 0.05, 0);
  deck.material = painted;
  const skirt = (w, h, d, x, z) => addMesh(
    canopyGroup,
    new THREE.BoxGeometry(w, h, d),
    rust,
    x,
    canopy.top - canopy.fascia / 2,
    z,
  );
  skirt(canopy.w, canopy.fascia, 0.08, 0, canopy.d / 2);
  skirt(canopy.w, canopy.fascia, 0.08, 0, -canopy.d / 2);
  skirt(0.08, canopy.fascia, canopy.d, canopy.w / 2, 0);
  skirt(0.08, canopy.fascia, canopy.d, -canopy.w / 2, 0);
  addMesh(
    canopyGroup,
    new THREE.BoxGeometry(canopy.w - 0.24, 0.035, canopy.d - 0.24),
    metal(0xc9c4ba, 0.92, 0.0),
    0,
    canopy.top - canopy.fascia + 0.03,
    0,
  );
  addMesh(canopyGroup, new THREE.BoxGeometry(0.9, 0.015, 0.7), rust, canopy.w * 0.28, canopy.top + 0.008, -0.3);

  const neon = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, canopy.w - 0.15, 8), neonMat);
  neon.rotation.z = Math.PI / 2;
  neon.position.set(0, canopy.top - canopy.fascia + 0.04, canopy.d / 2 - 0.02);
  canopyGroup.add(neon);

  for (let i = 0; i < 2; i += 1) {
    const housing = addMesh(
      canopyGroup,
      new THREE.BoxGeometry(canopy.w * 0.62, 0.045, 0.18),
      metal(0xe4e0d6, 0.7, 0.08),
      0,
      canopy.top - canopy.fascia - 0.01,
      -0.4 + i * 0.8,
    );
    housing.castShadow = false;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, canopy.w * 0.55, 8), tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, canopy.top - canopy.fascia - 0.08, -0.4 + i * 0.8);
    canopyGroup.add(tube);
  }

  const columnH = canopy.top - canopy.fascia;
  [[-canopy.w * 0.32, canopy.d * 0.22], [canopy.w * 0.22, -canopy.d * 0.18]].forEach(([x, z]) => {
    addMesh(canopyGroup, new THREE.BoxGeometry(0.16, columnH, 0.16), metal(0xd2cdc4, 0.8, 0.05), x, columnH / 2, z);
    addMesh(canopyGroup, new THREE.BoxGeometry(0.28, 0.04, 0.28), metal(0xb7b2aa, 0.7, 0.15), x, columnH - 0.02, z);
    addMesh(canopyGroup, new THREE.BoxGeometry(0.26, 0.06, 0.26), metal(0x8a8682, 0.9, 0.02), x, 0.03, z);
  });

  const priceA = labelTexture("1.89", "#1a120c", "#f0c36a", 132);
  const priceB = labelTexture("1.95", "#1a120c", "#f0c36a", 132);
  [[-canopy.w * 0.12, canopy.d * 0.28, priceA, 1], [canopy.w * 0.2, canopy.d * 0.42, priceB, 2]].forEach(([x, z, tex, grade]) => {
    const pump = makeDetailedPump(tex, grade);
    pump.position.set(x, 0, z);
    canopyGroup.add(pump);
  });
  group.add(canopyGroup);

  const shop = WORLD.shop;
  const shopGroup = new THREE.Group();
  shopGroup.position.set(shop.x, 0, shop.z);
  shopGroup.rotation.y = shop.yaw;
  const wallH = shop.h;
  addMesh(shopGroup, new THREE.BoxGeometry(shop.w, wallH, 0.1), wallMat, 0, wallH / 2, shop.d / 2);
  addMesh(shopGroup, new THREE.BoxGeometry(0.1, wallH, shop.d, ), wallMat, -shop.w / 2, wallH / 2, 0);
  addMesh(shopGroup, new THREE.BoxGeometry(0.1, wallH, shop.d), wallMat, shop.w / 2, wallH / 2, 0);
  const roof = addMesh(
    shopGroup,
    new THREE.BoxGeometry(shop.w + 0.18, 0.14, shop.d + 0.18),
    painted,
    0,
    wallH + 0.07,
    0,
  );
  roof.material = painted;
  const shopNeon = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, shop.w + 0.05, 8), neonMat);
  shopNeon.rotation.z = Math.PI / 2;
  shopNeon.position.set(0, wallH - 0.02, -shop.d / 2 - 0.02);
  shopGroup.add(shopNeon);
  addStorefront(shopGroup, shop);

  const ac = addMesh(shopGroup, new THREE.BoxGeometry(0.62, 0.32, 0.42), metal(0xb9bbb6, 0.55, 0.25), 0.4, wallH + 0.3, 0.35);
  for (let i = 0; i < 3; i += 1) {
    addMesh(shopGroup, new THREE.BoxGeometry(0.48, 0.015, 0.02), metal(0x2a2a28, 0.6, 0.2), 0.4, wallH + 0.2 + i * 0.07, 0.56);
  }
  ac.castShadow = true;
  const util = addMesh(shopGroup, new THREE.BoxGeometry(0.45, 0.7, 0.28), metal(0x8d9290, 0.6, 0.3), shop.w / 2 + 0.2, 0.4, 0.2);
  util.castShadow = true;
  group.add(shopGroup);

  const sign = WORLD.sign;
  const signGroup = new THREE.Group();
  signGroup.position.set(sign.x, 0, sign.z);
  signGroup.rotation.y = sign.yaw;
  const boardBottom = sign.h;
  const pole = addMesh(
    signGroup,
    new THREE.CylinderGeometry(0.07, 0.09, boardBottom, 10),
    metal(0x8e9398, 0.5, 0.35),
    0,
    boardBottom / 2,
    -0.16,
  );
  pole.castShadow = true;
  addMesh(signGroup, new THREE.BoxGeometry(0.08, 0.08, 0.22), metal(0x8e9398, 0.5, 0.35), 0, boardBottom, -0.08);
  const board = addMesh(
    signGroup,
    new THREE.BoxGeometry(sign.w, sign.t, 0.06),
    metal(0x140c0b, 0.7, 0.05),
    0,
    boardBottom + sign.t / 2,
    0,
  );
  board.castShadow = true;
  const gasTex = labelTexture("GAS", "#120807", "#ff3a2a", 118);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(sign.w - 0.16, sign.t - 0.16),
    new THREE.MeshStandardMaterial({
      map: gasTex,
      emissive: 0xff2e24,
      emissiveMap: gasTex,
      emissiveIntensity: 1.05,
      roughness: 0.55,
    }),
  );
  face.position.set(0, boardBottom + sign.t / 2, 0.035);
  signGroup.add(face);
  const hoursTex = labelTexture("24 HOURS", "#120807", "#ffb199", 58);
  const hours = new THREE.Mesh(
    new THREE.PlaneGeometry(sign.w * 0.72, 0.28),
    new THREE.MeshStandardMaterial({
      map: hoursTex,
      emissive: 0xff6a55,
      emissiveMap: hoursTex,
      emissiveIntensity: 0.8,
      roughness: 0.55,
    }),
  );
  hours.position.set(0, boardBottom - 0.22, 0.035);
  const hoursBoard = addMesh(signGroup, new THREE.BoxGeometry(sign.w * 0.78, 0.34, 0.05), metal(0x140c0b, 0.7, 0.05), 0, boardBottom - 0.22, 0);
  hoursBoard.castShadow = true;
  signGroup.add(hours);
  group.add(signGroup);

  [[-3.3, -6.15], [-0.55, -5.55], [1.45, -6.7]].forEach(([x, z]) => {
    addMesh(group, new THREE.CylinderGeometry(0.07, 0.08, 0.78, 8), metal(0xd7d2c8, 0.75, 0.05), x, 0.39, z);
    addMesh(group, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8), metal(0x22211f, 0.7, 0.05), x, 0.58, z);
  });

  addMesh(group, new THREE.CylinderGeometry(0.2, 0.22, 0.62, 10), metal(0x2c4638, 0.8, 0.02), 1.15, 0.31, -13.2);
  addMesh(group, new THREE.CylinderGeometry(0.23, 0.23, 0.05, 10), metal(0x24382d, 0.7, 0.05), 1.15, 0.64, -13.2);
  addMesh(group, new THREE.BoxGeometry(0.55, 0.7, 0.32), metal(0x6e7270, 0.7, 0.2), 3.4, 0.4, -9.6);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12), metal(0x1c1c1c, 0.8, 0.02));
  coil.position.set(3.75, 0.45, -9.35);
  coil.rotation.y = 0.6;
  group.add(coil);

  return group;
}

function makeLights(scene) {
  const ambient = new THREE.AmbientLight(PALETTE.ambient, WORLD.light.ambient);
  const sun = new THREE.DirectionalLight(PALETTE.sun, WORLD.light.intensity);
  sun.castShadow = true;
  const dir = new THREE.Vector3(WORLD.light.dir.x, WORLD.light.dir.y, WORLD.light.dir.z).normalize();
  const focus = new THREE.Vector3(WORLD.target.x, 0, WORLD.target.z);
  sun.position.copy(focus).addScaledVector(dir, -120);
  sun.target.position.copy(focus);
  const extent = WORLD.light.extent;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 280;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(WORLD.light.mapSize, WORLD.light.mapSize);
  sun.shadow.bias = WORLD.light.bias;
  sun.shadow.normalBias = WORLD.light.normalBias;
  sun.shadow.radius = WORLD.light.radius;
  sun.shadow.blurSamples = WORLD.light.blurSamples;
  const canopyLight = new THREE.PointLight(0xfff1d2, 3.4, 14, 2);
  canopyLight.position.set(-2.1, 1.55, -7.4);
  const shopLight = new THREE.PointLight(0xffb15a, 7.5, 11, 2);
  shopLight.position.set(-2.1, 1.7, -11.2);
  const neonLight = new THREE.PointLight(0xff3a2a, 3.2, 12, 2);
  neonLight.position.set(-2.2, 2.0, -6.6);
  scene.add(ambient, sun, sun.target, canopyLight, shopLight, neonLight);
  return { ambient, sun };
}

export function buildScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 28, 160);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vDir; void main(){ float h = clamp(normalize(vDir).y, 0.0, 1.0); vec3 zenith = vec3(0.05, 0.08, 0.16); vec3 mid = vec3(0.18, 0.24, 0.36); vec3 hor = vec3(0.72, 0.42, 0.28); vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h)); col = mix(col, zenith, smoothstep(0.22, 0.72, h)); gl_FragColor = vec4(col, 1.0); }",
    }),
  );
  sky.frustumCulled = false;
  scene.add(sky);

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
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x7d7974, roughness: 0.94, metalness: 0.02 });
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
    [[-1.4, -4.2], [-0.6, -4.55], [0.5, -4.3], [1.3, -4.7], [2.1, -4.45]],
    [[1.6, -6.1], [2.2, -6.45], [2.7, -6.2], [3.4, -6.55]],
    [[-2.2, -7.4], [-1.5, -7.15], [-0.7, -7.5], [0.1, -7.25]],
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
  [[-0.8, -5.8, 1.6, 0.5], [1.4, -6.9, 1.5, 0.55]].forEach(([x, z, w, d]) => {
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.004, d),
      new THREE.MeshStandardMaterial({ color: 0xc2b6a0, roughness: 1, metalness: 0 }),
    );
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
