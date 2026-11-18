// Pedestrians: low-poly walkers who stroll the sidewalks, wait at curbs,
// flee when punched and scatter when a car bears down on them.
import * as THREE from 'three';
import { PEDESTRIANS } from './config.js';
import { ROAD_LINES, isOnRoad } from './world.js';
import { range } from './random.js';

const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1, 0x1abc9c, 0xff6b81];

function buildPedestrian(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.8 }),
  );
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), legMat);
  legL.position.set(-0.16, 0.28, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  return { group, legL, legR };
}

export function createPedestrians(scene, random) {
  const walkers = [];
  for (let i = 0; i < PEDESTRIANS.count; i += 1) {
    // Start on a sidewalk: near a road line but off the asphalt.
    const line = ROAD_LINES[Math.floor(random() * ROAD_LINES.length)];
    const along = range(random, -190, 190);
    const horizontal = random() < 0.5;
    const side = random() < 0.5 ? -8.5 : 8.5;
    const x = horizontal ? along : line + side;
    const z = horizontal ? line + side : along;
    const { group, legL, legR } = buildPedestrian(SHIRT_COLORS[i % SHIRT_COLORS.length]);
    group.position.set(x, 0, z);
    scene.add(group);
    walkers.push({
      group,
      legL,
      legR,
      x,
      z,
      heading: random() * Math.PI * 2,
      speed: range(random, PEDESTRIANS.speed * 0.7, PEDESTRIANS.speed * 1.3),
      flee: 0,
      phase: random() * Math.PI * 2,
    });
  }

  function step(dt, player, cars) {
    for (const p of walkers) {
      // Flee from a punch or a car closing in.
      let threat = null;
      if (p.flee > 0) {
        p.flee -= dt;
        threat = { x: player.x, z: player.z };
      } else {
        for (const car of cars) {
          const dx = p.x - car.x;
          const dz = p.z - car.z;
          const d = Math.hypot(dx, dz);
          if (d < 7 && Math.abs(car.speed) > 3) {
            threat = { x: car.x, z: car.z };
            p.flee = 1.2;
            break;
          }
        }
      }
      if (threat) {
        const dx = p.x - threat.x;
        const dz = p.z - threat.z;
        p.heading = Math.atan2(dx, dz);
        p.speed = 4.5;
      } else {
        p.speed += (1.6 - p.speed) * Math.min(1, dt);
        // Wander: pick a new heading now and then, stay off the road.
        if (Math.random() < dt * 0.15) p.heading += (Math.random() - 0.5) * 1.6;
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (Math.abs(p.x) > 205) p.heading = Math.atan2(-p.x, p.z);
      if (Math.abs(p.z) > 205) p.heading = Math.atan2(p.x, -p.z);
      if (isOnRoad(p.x, p.z) && p.flee <= 0) {
        // Step back onto the sidewalk.
        p.heading += Math.PI * 0.5;
      }
      p.phase += dt * (4 + p.speed * 2);
      p.legL.rotation.x = Math.sin(p.phase) * 0.6;
      p.legR.rotation.x = -Math.sin(p.phase) * 0.6;
      p.group.position.set(p.x, 0, p.z);
      p.group.rotation.y = p.heading;
    }
  }

  // The closest walker to a point, within `maxDist`. Used for punching.
  function nearestTo(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const p of walkers) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  return { walkers, step, nearestTo };
}
