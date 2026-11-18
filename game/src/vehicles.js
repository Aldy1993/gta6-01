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
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.35, metalness: 0.7 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.38, wz);
    group.add(hub);
    wheels.push(wheel);
  }
  // Front grille + headlights, rear taillights: the car reads as a car
  // from the front and the back, not a coloured slab. The sport body is
  // longer (half-length 2.3 vs 2.1), so every face detail is placed off
  // the true half-length — v3 buried the GT's lights inside its own body.
  const halfLen = isSport ? 2.3 : 2.1;
  const frontZ = halfLen + 0.01;
  const rearZ = -halfLen - 0.01;
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.22, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.5, metalness: 0.4 }),
  );
  grille.position.set(0, 0.62, frontZ);
  group.add(grille);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.2, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), headMat);
    head.position.set(side * 0.68, 0.72, frontZ);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xaa1111, emissiveIntensity: 1.4, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tailMat);
    tail.position.set(side * 0.68, 0.78, rearZ);
    group.add(tail);
  }
  // Full-width taillight bar joining the two lamps, dark rear bumper,
  // licence plate and twin exhaust tips — the rear reads as a rear,
  // especially on the GT in the chase shot.
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.14, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xdd2222, emissive: 0xcc1111, emissiveIntensity: 1.8, roughness: 0.3 }),
  );
  tailBar.position.set(0, 0.86, rearZ - 0.01);
  group.add(tailBar);
  const rearBumper = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.26, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.5, metalness: 0.4 }),
  );
  rearBumper.position.set(0, 0.3, rearZ - 0.01);
  group.add(rearBumper);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.22, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 }),
  );
  plate.position.set(0, 0.58, rearZ - 0.03);
  group.add(plate);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.7 });
  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.14), exhaustMat);
    exhaust.position.set(side * 0.62, 0.16, rearZ - 0.06);
    group.add(exhaust);
  }
  if (isSport) {
    // Rear spoiler on the Sunray GT.
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.4, metalness: 0.5 }),
    );
    spoiler.position.set(0, 1.18, rearZ + 0.18);
    group.add(spoiler);
  }
  let lightBar = null;
  let lightBar2 = null;
  let headlights = null;
  if (isPolice) {
    // Black-and-white livery: black hood + trunk panels over a white body.
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.4, metalness: 0.3 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.3), blackMat);
    hood.position.set(0, 1.04, 1.45);
    group.add(hood);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.0), blackMat);
    trunk.position.set(0, 1.04, -1.6);
    group.add(trunk);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.42, 1.6), blackMat);
    door.position.set(0, 0.72, -0.2);
    group.add(door);
    // Split light bar: red left, blue right — both flash in police.step.
    lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.24, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.5 }),
    );
    lightBar.position.set(-0.36, 1.78, -0.1);
    group.add(lightBar);
    lightBar2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.24, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 2.5 }),
    );
    lightBar2.position.set(0.36, 1.78, -0.1);
    group.add(lightBar2);
  }
  headlights = new THREE.PointLight(0xfff2b0, isPolice ? 14 : 0, 26);
  headlights.position.set(0, 0.8, 2.4);
  group.add(headlights);
  return { group, wheels, lightBar, lightBar2, headlights };
}

// A drivable car: position, heading, speed and the per-frame drive step.
export function createDrivableCar(scene, color, x, z, heading, isPolice, isSport) {
  const { group, wheels, lightBar, lightBar2, headlights } = buildCarMesh(color, isPolice, isSport);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  const car = {
    group,
    wheels,
    lightBar,
    lightBar2,
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
