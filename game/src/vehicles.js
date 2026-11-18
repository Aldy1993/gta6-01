// Cars: building a car mesh, the player's own car, and the arcade driving
// model (accelerate, steer, drift-free grip, building collision).
import * as THREE from 'three';
import { CAR, TRAFFIC } from './config.js';
import { pick } from './random.js';

export function buildCarMesh(color, isPolice, isSport) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, isSport ? 4.6 : 4.2), bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1a2733, roughness: 0.15, metalness: 0.7 }),
  );
  cabin.position.set(0, 1.3, isSport ? 0.1 : -0.15);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  let lightBar = null;
  let headlights = null;
  if (isPolice) {
    lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.22, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }),
    );
    lightBar.position.set(0, 1.75, -0.1);
    group.add(lightBar);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.3, 4.22),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
    );
    stripe.position.y = 0.75;
    group.add(stripe);
  }
  headlights = new THREE.PointLight(0xfff2b0, 0, 22);
  headlights.position.set(0, 0.8, 2.4);
  group.add(headlights);
  return { group, wheels, lightBar, headlights };
}

// A drivable car: position, heading, speed and the per-frame drive step.
export function createDrivableCar(scene, color, x, z, heading, isPolice, isSport) {
  const { group, wheels, lightBar, headlights } = buildCarMesh(color, isPolice, isSport);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  const car = {
    group,
    wheels,
    lightBar,
    headlights,
    x,
    z,
    heading,
    speed: 0,
    isPolice,
    isSport: !!isSport,
    parked: false,
    steerVisual: 0,
  };
  return car;
}

// Arcade driving: W/S throttle, A/D steer (stronger at speed), drag, and a
// soft push-out from buildings. Returns distance driven this frame.
export function driveCar(car, input, dt, resolveCollision) {
  const fwd = input.isHeld('forward') ? 1 : 0;
  const back = input.isHeld('back') ? 1 : 0;
  const left = input.isHeld('left') ? 1 : 0;
  const right = input.isHeld('right') ? 1 : 0;
  if (fwd) car.speed += CAR.accel * dt;
  if (back) car.speed -= car.speed > 0.5 ? CAR.brake * dt : CAR.reverseAccel * dt;
  car.speed -= car.speed * CAR.drag * dt;
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerAmount = (left - right) * CAR.steer * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.heading += steerAmount;
  car.steerVisual = (left - right) * 0.4;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const pos = resolveCollision({ x: nx, z: nz }, 1.6);
  const hitWall = Math.abs(pos.x - nx) > 0.01 || Math.abs(pos.z - nz) > 0.01;
  if (hitWall) car.speed *= 0.45;
  car.x = pos.x;
  car.z = pos.z;
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
  for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
  return Math.abs(car.speed) * dt;
}

export function randomCarColor(random) {
  return pick(random, TRAFFIC.colors);
}
