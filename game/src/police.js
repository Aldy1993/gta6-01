// Solano PD: police cruisers that spawn at the city edge when the wanted
// level rises, chase the player, ram their car, and give up when the heat
// dies down. Their light bars flash red/blue while they hunt.
import { POLICE } from './config.js';
import { createDrivableCar } from './vehicles.js';
import { range } from './random.js';

export function createPolice(scene, random) {
  const cruisers = [];
  let flash = 0;

  function spawnNear(x, z) {
    const angle = random() * Math.PI * 2;
    const px = Math.max(-200, Math.min(200, x + Math.cos(angle) * 70));
    const pz = Math.max(-200, Math.min(200, z + Math.sin(angle) * 70));
    const car = createDrivableCar(scene, 0xf5f5f5, px, pz, Math.atan2(x - px, z - pz), true, false);
    car.chaseSpeed = POLICE.chaseSpeed * range(random, 0.9, 1.1);
    cruisers.push(car);
    return car;
  }

  // Staging only: put a cruiser exactly where a screenshot needs it.
  function placeCruiser(x, z, heading) {
    const car = createDrivableCar(scene, 0xf5f5f5, x, z, heading, true, false);
    car.chaseSpeed = POLICE.chaseSpeed;
    cruisers.push(car);
    return car;
  }

  function step(dt, playerPos, wanted, resolveCollision) {
    flash += dt;
    const wantedCount = Math.min(wanted, POLICE.maxCars);
    while (cruisers.length < wantedCount) spawnNear(playerPos.x, playerPos.z);
    while (cruisers.length > wantedCount) {
      const car = cruisers.pop();
      scene.remove(car.group);
    }
    const flashingRed = Math.floor(flash * 4) % 2 === 0;
    for (const car of cruisers) {
      if (car.lightBar) {
        car.lightBar.material.emissive.setHex(flashingRed ? 0xff2222 : 0x2266ff);
        car.lightBar.material.color.setHex(flashingRed ? 0xff2222 : 0x2266ff);
      }
      if (car.headlights) car.headlights.intensity = flashingRed ? 30 : 12;
      // Steer toward the player, ram when close.
      const dx = playerPos.x - car.x;
      const dz = playerPos.z - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2.4 * dt));
      const speed = dist > 4 ? car.chaseSpeed : car.chaseSpeed * 0.55;
      car.speed += (speed - car.speed) * Math.min(1, dt * 1.2);
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      const pos = resolveCollision({ x: nx, z: nz }, 1.6);
      car.x = pos.x;
      car.z = pos.z;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
    }
  }

  return { cruisers, step, placeCruiser };
}
