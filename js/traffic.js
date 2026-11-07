import * as THREE from "three";
import { PALETTE, WORLD, runtime } from "./state.js";

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
