import * as THREE from "three";
import { PALETTE, WORLD, runtime } from "./state.js";

function softGlow(hex) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, hex);
  grad.addColorStop(0.35, hex);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const headGlowMap = softGlow("#fff6e0");
const tailGlowMap = softGlow("#ff2a22");

function makeWheel() {
  const wheel = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10),
    new THREE.MeshLambertMaterial({ color: PALETTE.tire }),
  );
  tire.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.18, 8),
    new THREE.MeshBasicMaterial({ color: PALETTE.hub }),
  );
  hub.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire, hub);
  return wheel;
}

function makeCar(color) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const roofMat = new THREE.MeshLambertMaterial({ color: color.clone().offsetHSL(0, -0.02, 0.04) });
  const glassMat = new THREE.MeshLambertMaterial({ color: PALETTE.glass });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.44, 4.15), bodyMat);
  body.position.y = 0.64;
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.16, 4.2),
    new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.82) }),
  );
  skirt.position.y = 0.4;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.36, 1.85), roofMat);
  cabin.position.set(0, 1.02, -0.12);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 1.15), glassMat);
  glass.position.set(0, 0.98, 0.42);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.9), roofMat);
  nose.position.set(0, 0.9, 1.35);

  const wheels = [];
  for (const [x, z] of [[0.78, 1.28], [-0.78, 1.28], [0.78, -1.28], [-0.78, -1.28]]) {
    const wheel = makeWheel();
    wheel.position.set(x, 0.36, z);
    wheels.push(wheel);
    car.add(wheel);
  }

  for (const mesh of [body, skirt, cabin, glass, nose]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    car.add(mesh);
  }

  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e4 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2c24 });
  const beamLength = 4.2;
  const beamMat = (axis, radius) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uSwap: { value: axis } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; uniform float uSwap; void main(){ float along = 1.0 - mix(vUv.y, vUv.x, uSwap); float across = abs(mix(vUv.x, vUv.y, uSwap) - 0.5) * 2.0; float radial = pow(1.0 - smoothstep(0.0, 1.0, across), 1.8); float travel = pow(1.0 - smoothstep(0.0, 0.9, along), 0.7); float alpha = radial * travel * 0.5; if (alpha < 0.012) discard; gl_FragColor = vec4(1.0, 0.94, 0.8, alpha); }",
  });
  const beam = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, beamLength), beamMat(0));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(0, 0.36, 2.15 + beamLength / 2);
  const pivot = new THREE.Group();
  pivot.rotation.x = -Math.PI / 2;
  pivot.position.set(0, 0.5, 2.15 + beamLength / 2);
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.15, beamLength), beamMat(0));
  shaft.rotation.y = Math.PI / 2;
  pivot.add(shaft);
  beam.add(sheet, pivot);
  beam.renderOrder = 3;
  car.add(beam);
  [[0.46, 2.14], [-0.46, 2.14]].forEach(([x, z]) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), lampMat);
    lamp.position.set(x, 0.58, z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: headGlowMap,
      color: 0xfff3d4,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: 0.95,
    }));
    glow.position.set(x, 0.58, z + 0.12);
    glow.scale.set(0.85, 0.85, 1);
    car.add(lamp, glow);
  });
  [[0.52, -2.16], [-0.52, -2.16]].forEach(([x, z]) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), tailMat);
    tail.position.set(x, 0.62, z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tailGlowMap,
      color: 0xff2a22,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      opacity: 0.9,
    }));
    glow.position.set(x, 0.62, z - 0.1);
    glow.scale.set(0.55, 0.55, 1);
    car.add(tail, glow);
  });

  car.userData.wheels = wheels;
  car.scale.setScalar(0.58);
  return car;
}

export function createTraffic(scene) {
  const { nearZ, farZ, nearSpeed, farSpeed, limit } = WORLD.lanes;
  const span = limit * 2;
  const cars = WORLD.traffic.map((spec) => {
    const near = spec.lane === "near";
    const color = new THREE.Color(spec.color);
    const mesh = makeCar(color);
    scene.add(mesh);
    return {
      id: spec.id,
      mesh,
      x: spec.x,
      z: near ? nearZ : farZ,
      dir: near ? 1 : -1,
      speed: near ? nearSpeed : farSpeed,
    };
  });

  function wrap(car) {
    if (car.x > limit) car.x -= span;
    else if (car.x < -limit) car.x += span;
  }

  function place(car) {
    car.mesh.position.set(car.x, 0, car.z);
    // Local +Z is the nose. +90° yaw points it down +X.
    car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  cars.forEach(place);

  function update(dt) {
    const step = runtime.still ? 0 : dt;
    for (const car of cars) {
      car.x += car.dir * car.speed * step;
      wrap(car);
      place(car);
      const spin = (car.speed * step) / 0.32;
      for (const wheel of car.mesh.userData.wheels) {
        wheel.rotation.x += spin * car.dir;
      }
    }
  }

  function sample() {
    return cars.map((car) => ({
      id: car.id,
      x: car.x,
      z: car.z,
      dir: car.dir,
    }));
  }

  return { update, sample };
}
