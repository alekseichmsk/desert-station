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

function labelTexture(lines, bg, fg, fontPx) {
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
  const list = Array.isArray(lines) ? lines : [lines];
  const step = 256 / (list.length + 1);
  list.forEach((line, index) => {
    ctx.fillText(line, 256, step * (index + 1));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function metal(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeDetailedPump(priceTexture) {
  const pump = new THREE.Group();
  const cream = metal(0xe6d8c6, 0.55, 0.08);
  const red = metal(0x8a332c, 0.5, 0.18);
  const steel = metal(0xb7b3ac, 0.38, 0.62);
  const rubber = metal(0x161616, 0.72, 0.05);
  const concrete = metal(0x8a8681, 0.92, 0.02);

  const island = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 0.72), concrete));
  island.position.y = 0.06;
  const skirt = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.36), steel));
  skirt.position.y = 0.2;
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.15, 0.28), cream));
  body.position.y = 0.86;
  const band = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.3), red));
  band.position.y = 1.18;
  const cap = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.26), steel));
  cap.position.y = 1.48;
  const bezel = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.03), metal(0x120e0c, 0.4, 0.4)));
  bezel.position.set(0, 1.32, 0.155);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.15),
    new THREE.MeshStandardMaterial({
      map: priceTexture,
      emissive: 0xffc56a,
      emissiveMap: priceTexture,
      emissiveIntensity: 0.85,
      roughness: 0.35,
    }),
  );
  screen.position.set(0, 1.32, 0.175);
  pump.add(island, skirt, body, band, cap, bezel, screen);

  for (let i = 0; i < 3; i += 1) {
    const button = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.025), i === 1 ? red : steel));
    button.position.set(-0.1 + i * 0.1, 1.05, 0.155);
    pump.add(button);
  }
  const nozzle = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.07), rubber));
  nozzle.position.set(0.3, 1.02, 0.02);
  const holster = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.08), steel));
  holster.position.set(0.28, 1.0, 0);
  pump.add(nozzle, holster);

  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.24, 1.22, 0.02),
        new THREE.Vector3(0.62, 0.55, 0.2),
        new THREE.Vector3(0.3, 0.92, 0.04),
      ),
      16,
      0.02,
      6,
      false,
    ),
    rubber,
  );
  hose.castShadow = true;
  pump.add(hose);
  pump.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return pump;
}

function addStorefront(shopGroup, shop) {
  const frameMat = metal(0x3c342f, 0.5, 0.4);
  const glass = new THREE.MeshBasicMaterial({
    color: 0xd7eefe,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const z = -shop.d / 2;
  const winW = shop.w * 0.46;
  const winH = shop.h * 0.52;
  const winX = -shop.w * 0.16;
  const winY = shop.h * 0.58;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glass);
  pane.position.set(winX, winY, z - 0.02);
  const doorW = shop.w * 0.28;
  const doorX = shop.w * 0.24;
  const doorH = shop.h * 0.78;
  const doorPane = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.72, shop.h * 0.48), glass);
  doorPane.position.set(doorX, shop.h * 0.5, z - 0.02);
  const bars = [
    [winW + 0.1, 0.06, 0.07, winX, winY + winH / 2, z],
    [winW + 0.1, 0.06, 0.07, winX, winY - winH / 2, z],
    [0.06, winH, 0.07, winX - winW / 2, winY, z],
    [0.06, winH, 0.07, winX + winW / 2, winY, z],
    [doorW + 0.1, 0.06, 0.07, doorX, doorH, z],
    [0.06, doorH, 0.07, doorX - doorW / 2, doorH / 2, z],
    [0.06, doorH, 0.07, doorX + doorW / 2, doorH / 2, z],
  ];
  for (const [bw, bh, bd, bx, by, bz] of bars) {
    const bar = shadow(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frameMat));
    bar.position.set(bx, by, bz);
    shopGroup.add(bar);
  }
  const handle = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.04), metal(0xd7d2cb, 0.3, 0.7)));
  handle.position.set(doorX + doorW * 0.28, shop.h * 0.46, z - 0.05);
  shopGroup.add(pane, doorPane, handle);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(shop.w * 0.88, 0.05, shop.d * 0.8),
    metal(0x6d5344, 0.8, 0.02),
  );
  floor.position.set(0, 0.08, 0.05);
  const counter = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(shop.w * 0.5, 0.85, 0.42),
    metal(0x8d6b4c, 0.55, 0.08),
  ));
  counter.position.set(0.05, 0.48, -0.05);
  const register = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x22201e, emissive: 0xffb15a, emissiveIntensity: 0.35, roughness: 0.4 }),
  );
  register.position.set(0.05, 0.98, -0.05);
  const glowWall = new THREE.Mesh(
    new THREE.PlaneGeometry(shop.w * 0.78, shop.h * 0.62),
    new THREE.MeshStandardMaterial({ color: 0xffd2a8, emissive: 0xffb06a, emissiveIntensity: 1.5, roughness: 0.7 }),
  );
  glowWall.position.set(winX, winY - 0.15, z + 0.9);
  glowWall.rotation.y = Math.PI;
  shopGroup.add(floor, counter, register, glowWall);

  const shelfMat = metal(0x5a4336, 0.7, 0.05);
  const goods = [0xc4493a, 0xe6c15a, 0x3d6b4f, 0xe7e0d4, 0x3e6294];
  for (let row = 0; row < 3; row += 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(shop.w * 0.72, 0.04, 0.26), shelfMat);
    shelf.position.set(winX, 0.55 + row * 0.32, z + 0.55);
    shopGroup.add(shelf);
    for (let i = 0; i < 5; i += 1) {
      const color = goods[(i + row) % goods.length];
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.2, 0.12),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.22,
          roughness: 0.45,
        }),
      );
      box.position.set(winX - 0.42 + i * 0.2, 0.72 + row * 0.32, z + 0.32);
      shopGroup.add(box);
    }
  }
}

function makeStation() {
  const group = new THREE.Group();
  group.name = "station";
  const roofMat = metal(0x8a847c, 0.62, 0.28);
  const rust = metal(0x7a4034, 0.7, 0.22);
  const wallMat = metal(0xc2b5a2, 0.78, 0.04);
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0xff4a38,
    emissive: 0xff2a1c,
    emissiveIntensity: 2.1,
    roughness: 0.28,
  });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xf7f8ee,
    emissive: 0xf3f6df,
    emissiveIntensity: 1.7,
    roughness: 0.25,
  });

  const canopy = WORLD.canopy;
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(canopy.x, 0, canopy.z);
  canopyGroup.rotation.y = canopy.yaw;
  const fascia = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(canopy.w, canopy.fascia, canopy.d),
    rust,
  ));
  fascia.position.y = canopy.top - canopy.fascia / 2;
  const deck = shadow(new THREE.Mesh(new THREE.BoxGeometry(canopy.w * 0.96, 0.08, canopy.d * 0.92), roofMat));
  deck.position.y = canopy.top - 0.02;
  const patch = shadow(new THREE.Mesh(new THREE.BoxGeometry(canopy.w * 0.28, 0.02, canopy.d * 0.35), metal(0x5c4036, 0.8, 0.2)));
  patch.position.set(canopy.w * 0.28, canopy.top + 0.03, -canopy.d * 0.2);
  canopyGroup.add(fascia, deck, patch);

  const neonFront = new THREE.Mesh(new THREE.BoxGeometry(canopy.w + 0.06, 0.055, 0.055), neonMat);
  neonFront.position.set(0, canopy.top - canopy.fascia + 0.02, canopy.d / 2 + 0.03);
  const neonSide = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, canopy.d + 0.06), neonMat);
  neonSide.position.set(canopy.w / 2 + 0.02, canopy.top - canopy.fascia + 0.02, 0);
  canopyGroup.add(neonFront, neonSide);

  for (let i = 0; i < 3; i += 1) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, canopy.w * 0.72, 8), tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, canopy.top - canopy.fascia - 0.08, -0.55 + i * 0.5);
    canopyGroup.add(tube);
  }

  const columnH = canopy.top - canopy.fascia;
  const columnMat = metal(0xcfc8be, 0.55, 0.15);
  [[-canopy.w * 0.28, canopy.d * 0.18], [canopy.w * 0.18, -canopy.d * 0.16]].forEach(([x, z]) => {
    const column = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, columnH, 0.18), columnMat));
    column.position.set(x, columnH / 2, z);
    canopyGroup.add(column);
  });

  const priceA = labelTexture("1.89", "#140c06", "#ffcf6b", 150);
  const priceB = labelTexture("1.95", "#140c06", "#ffcf6b", 150);
  [[-canopy.w * 0.18, canopy.d * 0.22, priceA], [canopy.w * 0.16, canopy.d * 0.4, priceB]].forEach(([x, z, tex]) => {
    const pump = makeDetailedPump(tex);
    pump.position.set(x, 0, z);
    canopyGroup.add(pump);
  });
  group.add(canopyGroup);

  const shop = WORLD.shop;
  const shopGroup = new THREE.Group();
  shopGroup.position.set(shop.x, 0, shop.z);
  shopGroup.rotation.y = shop.yaw;
  const slab = (w, h, d, x, y, z, mat) => {
    const mesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
    mesh.position.set(x, y, z);
    return mesh;
  };
  shopGroup.add(slab(shop.w, shop.h, 0.12, 0, shop.h / 2, shop.d / 2, wallMat));
  shopGroup.add(slab(0.12, shop.h, shop.d, -shop.w / 2, shop.h / 2, 0, wallMat));
  shopGroup.add(slab(0.12, shop.h, shop.d, shop.w / 2, shop.h / 2, 0, wallMat));
  shopGroup.add(slab(shop.w, 0.28, 0.12, 0, shop.h - 0.14, -shop.d / 2, wallMat));
  shopGroup.add(slab(shop.w, 0.22, 0.12, 0, 0.12, -shop.d / 2, wallMat));
  const roof = shadow(new THREE.Mesh(new THREE.BoxGeometry(shop.w, 0.14, shop.d), metal(0x6e6a64, 0.6, 0.3)));
  roof.position.y = shop.roof - 0.07;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(shop.w + 0.06, 0.06, shop.d + 0.06), neonMat);
  trim.position.y = shop.roof - 0.2;
  shopGroup.add(roof, trim);
  addStorefront(shopGroup, shop);

  const ac = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.5), metal(0xb7b8b4, 0.45, 0.4)));
  ac.position.set(0.1, shop.roof + 0.2, 0.2);
  for (let i = 0; i < 4; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.36), metal(0x2e2e2c, 0.5, 0.3));
    slat.position.set(0.1, shop.roof + 0.08 + i * 0.08, 0.2);
    shopGroup.add(slat);
  }
  shopGroup.add(ac);
  group.add(shopGroup);

  const sign = WORLD.sign;
  const signGroup = new THREE.Group();
  signGroup.position.set(sign.x, 0, sign.z);
  signGroup.rotation.y = sign.yaw;
  const pole = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, sign.h, 10),
    metal(0x8d9296, 0.45, 0.5),
  ));
  pole.position.y = sign.h / 2;
  const gasTex = labelTexture("GAS", "#140606", "#ff3b2e", 168);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(sign.w * 0.82, sign.t * 0.62),
    new THREE.MeshStandardMaterial({
      map: gasTex,
      emissive: 0xff2a22,
      emissiveMap: gasTex,
      emissiveIntensity: 1.35,
      roughness: 0.4,
    }),
  );
  face.material.side = THREE.DoubleSide;
  face.position.set(0, sign.h, 0.09);
  const board = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(sign.w, sign.t, 0.12),
    metal(0x1a0c0b, 0.5, 0.2),
  ));
  board.position.y = sign.h;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(sign.w + 0.08, sign.t + 0.08, 0.04), neonMat);
  glow.position.set(0, sign.h, 0.08);
  const hoursTex = labelTexture("24 HOURS", "#140606", "#ffb199", 64);
  const hours = new THREE.Mesh(
    new THREE.PlaneGeometry(sign.w * 0.7, 0.32),
    new THREE.MeshStandardMaterial({
      map: hoursTex,
      emissive: 0xff6a55,
      emissiveMap: hoursTex,
      emissiveIntensity: 1.1,
      roughness: 0.4,
    }),
  );
  hours.material.side = THREE.DoubleSide;
  hours.position.set(0, sign.h - sign.t * 0.72, 0.09);
  const hoursBack = shadow(new THREE.Mesh(new THREE.BoxGeometry(sign.w * 0.76, 0.38, 0.08), metal(0x1a0c0b, 0.5, 0.2)));
  hoursBack.position.set(0, sign.h - sign.t * 0.72, 0.04);
  signGroup.add(pole, board, face, hoursBack, hours);
  group.add(signGroup);

  const bollardMat = metal(0xd9d3c8, 0.55, 0.15);
  const bandMat = metal(0x222, 0.6, 0.1);
  [[-3.4, -6.2], [-0.4, -5.6], [1.6, -6.8], [-4.2, -8.4]].forEach(([x, z]) => {
    const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 8), bollardMat));
    post.position.set(x, 0.42, z);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 8), bandMat);
    stripe.position.set(x, 0.62, z);
    group.add(post, stripe);
  });
  const bin = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.7, 10), metal(0x2f4a3c, 0.6, 0.1)));
  bin.position.set(-0.2, 0.35, -14.6);
  const lid = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 10), metal(0x24382e, 0.5, 0.2)));
  lid.position.set(-0.2, 0.72, -14.6);
  group.add(bin, lid);

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
  const canopyLight = new THREE.PointLight(0xfff1d2, 6.5, 16, 2);
  canopyLight.position.set(-2.3, 2.15, -7.2);
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
      fragmentShader: "varying vec3 vDir; void main(){ float h = clamp(normalize(vDir).y * 0.55 + 0.45, 0.0, 1.0); vec3 zenith = vec3(0.07, 0.14, 0.28); vec3 mid = vec3(0.20, 0.36, 0.58); vec3 hor = vec3(0.78, 0.48, 0.34); vec3 col = mix(hor, mid, smoothstep(0.02, 0.38, h)); col = mix(col, zenith, smoothstep(0.38, 0.95, h)); gl_FragColor = vec4(col, 1.0); }",
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
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x6a6662, roughness: 0.84, metalness: 0.06 });
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
  [[0.4, -5.4, 2.2, 0.35], [2.1, -6.6, 1.5, -0.5], [-1.1, -4.6, 1.3, 0.8], [3.4, -7.4, 1.8, 0.1], [-2.6, -8.2, 1.1, -0.9]].forEach(([x, z, len, rot]) => {
    const crack = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.03), crackMat);
    crack.position.set(x, 0.07, z);
    crack.rotation.y = rot;
    crack.receiveShadow = true;
    scene.add(crack);
  });

  scene.add(makeHills());
  scene.add(makeStation());
  scene.add(makePoles());
  scene.add(makeBushes());
  makeLights(scene);

  return scene;
}
