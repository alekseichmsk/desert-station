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

function makePump(spec, hoseTarget) {
  const pump = new THREE.Group();
  pump.position.set(spec.x, 0, spec.z);
  const island = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.5, 0.1, 16),
    lambert(PALETTE.pumpIsland),
  ), true, true);
  island.scale.set(2.5, 1, 0.72);
  island.position.y = 0.06;
  const body = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.45, 0.36),
    lambert(PALETTE.pumpBody),
  ));
  body.position.y = 0.95;
  const stripe = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.32, 0.38),
    lambert(PALETTE.coral),
  ));
  stripe.position.y = 1.22;
  const top = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.16, 0.26),
    lambert(0xd4d2cb),
  ));
  top.position.y = 1.74;
  pump.add(island, body, stripe, top);

  const a = new THREE.Vector3(spec.x + 0.22, 1.35, spec.z);
  const b = hoseTarget.clone();
  const mid = a.clone().lerp(b, 0.5);
  mid.y = Math.min(a.y, b.y) - 0.25;
  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, 0.02, 4, false),
    basic(PALETTE.wire),
  );
  hose.castShadow = true;
  pump.userData.hose = hose;
  return pump;
}

function makeStation() {
  const group = new THREE.Group();
  group.name = "station";
  const coral = lambert(PALETTE.coral);
  const roofMat = lambert(PALETTE.roof);
  const shopRoof = lambert(PALETTE.roofShop);
  const wallMat = lambert(PALETTE.wall);
  const windowMat = basic(PALETTE.window);

  const canopy = WORLD.canopy;
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(canopy.x, 0, canopy.z);
  canopyGroup.rotation.y = canopy.yaw;
  const fascia = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(canopy.w, canopy.fascia, canopy.d),
    coral,
  ));
  fascia.position.y = canopy.top - canopy.fascia / 2;
  const deck = shadow(new THREE.Mesh(
    new THREE.PlaneGeometry(canopy.w, canopy.d),
    roofMat,
  ), false, true);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = canopy.top + 0.01;
  canopyGroup.add(fascia, deck);

  const columnH = canopy.top - canopy.fascia;
  const columnGeo = new THREE.BoxGeometry(0.22, columnH, 0.22);
  const columnMat = lambert(PALETTE.column);
  const columns = [
    [-canopy.w * 0.28, canopy.d * 0.22],
    [canopy.w * 0.16, -canopy.d * 0.12],
  ];
  for (const [x, z] of columns) {
    const column = shadow(new THREE.Mesh(columnGeo, columnMat));
    column.position.set(x, columnH / 2, z);
    canopyGroup.add(column);
  }
  const pumpSpots = [
    [-canopy.w * 0.22, canopy.d * 0.18],
    [canopy.w * 0.12, canopy.d * 0.42],
  ];
  pumpSpots.forEach(([x, z], index) => {
    const anchor = new THREE.Vector3(columns[index][0], columnH * 0.7, columns[index][1]);
    const pump = makePump({ x, z }, anchor);
    canopyGroup.add(pump);
    if (pump.userData.hose) canopyGroup.add(pump.userData.hose);
  });
  group.add(canopyGroup);

  const shop = WORLD.shop;
  const shopGroup = new THREE.Group();
  shopGroup.position.set(shop.x, 0, shop.z);
  shopGroup.rotation.y = shop.yaw;
  const plinth = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(shop.w + 1.5, 0.14, shop.d + 1.7),
    lambert(PALETTE.plinth),
  ), false, true);
  plinth.position.y = 0.07;
  const walls = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(shop.w * 0.94, shop.h, shop.d * 0.94),
    wallMat,
  ));
  walls.position.y = shop.h / 2;
  const band = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(shop.w * 0.96, 0.28, shop.d * 0.96),
    coral,
  ));
  band.position.y = shop.roof - 0.22;
  const roof = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(shop.w, 0.16, shop.d),
    shopRoof,
  ));
  roof.position.y = shop.roof - 0.08;
  shopGroup.add(plinth, walls, band, roof);

  const frontZ = -shop.d / 2 - 0.02;
  const openings = [
    [-shop.w * 0.12, shop.h * 0.55, shop.w * 0.42, shop.h * 0.36, 0.05, frontZ],
    [shop.w * 0.22, shop.h * 0.42, shop.w * 0.2, shop.h * 0.55, 0.05, frontZ],
    [-shop.w / 2 - 0.02, shop.h * 0.55, 0.05, shop.h * 0.34, shop.d * 0.32, 0],
  ];
  for (const [x, y, w, h, d, z] of openings) {
    const opening = new THREE.Mesh(new THREE.BoxGeometry(w, h, d || 0.08), windowMat);
    opening.position.set(x, y, z);
    shopGroup.add(opening);
  }

  const pad = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.08, 1.7),
    lambert(PALETTE.shadowPad),
  ), false, true);
  pad.position.set(-shop.w / 2 - 0.7, 0.06, 0.15);
  const utility = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.55),
    lambert(PALETTE.utility),
  ));
  utility.position.set(-shop.w / 2 - 0.4, 0.55, 0.1);
  shopGroup.add(pad, utility);
  group.add(shopGroup);

  const sign = WORLD.sign;
  const signGroup = new THREE.Group();
  signGroup.position.set(sign.x, 0, sign.z);
  const foot = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.62, 0.1, 16),
    basic(0xd5d8d6),
  ), true, true);
  foot.position.y = 0.05;
  const pole = shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, sign.h, 10),
    basic(PALETTE.signPole),
  ));
  pole.position.y = (sign.h - sign.t * 0.5) / 2;
  pole.scale.y = (sign.h - sign.t * 0.5) / sign.h;
  const frame = shadow(new THREE.Mesh(
    new THREE.BoxGeometry(sign.w, sign.t, 0.16),
    basic(PALETTE.signFrame),
  ));
  frame.position.y = sign.h;
  frame.castShadow = false;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(sign.w - 0.42, sign.t - 0.28),
    basic(PALETTE.signFace),
  );
  face.material.side = THREE.DoubleSide;
  face.position.set(0, sign.h, 0.09);
  signGroup.rotation.y = sign.yaw;
  signGroup.add(foot, pole, frame, face);
  group.add(signGroup);

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
  scene.add(ambient, sun, sun.target);
  return { ambient, sun };
}

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fog.near, WORLD.fog.far);

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
  const apronMesh = shadow(new THREE.Mesh(apronGeo, lambert(PALETTE.apron)), false, true);
  apronMesh.position.set(apron.x, 0.035, apron.z);
  apronMesh.name = "apron";
  scene.add(apronMesh);

  const road = shadow(
    new THREE.Mesh(groundPlane(WORLD.roadLength, WORLD.roadWidth), lambert(PALETTE.road)),
    false,
    true,
  );
  road.position.y = 0.055;
  road.name = "road";
  scene.add(road);

  scene.add(makeHills());
  scene.add(makeStation());
  scene.add(makePoles());
  scene.add(makeBushes());
  makeLights(scene);

  return scene;
}
