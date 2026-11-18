// Traffic: civilian cars that cruise the road grid, slow for the car ahead
// and pause at intersections, so the streets feel alive.
import { TRAFFIC } from './config.js';
import { ROAD_LINES } from './world.js';
import { createDrivableCar, randomCarColor } from './vehicles.js';
import { pick, range } from './random.js';

function randomLaneSpot(random) {
  const line = pick(random, ROAD_LINES);
  const along = range(random, -200, 200);
  const horizontal = random() < 0.5;
  const offset = random() < 0.5 ? -2.8 : 2.8;
  return {
    x: horizontal ? along : line + offset,
    z: horizontal ? line + offset : along,
    heading: horizontal ? (offset > 0 ? Math.PI / 2 : -Math.PI / 2) : offset > 0 ? Math.PI : 0,
    horizontal,
  };
}

export function createTraffic(scene, random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const spot = randomLaneSpot(random);
    const car = createDrivableCar(scene, randomCarColor(random), spot.x, spot.z, spot.heading, false, false);
    car.cruiseSpeed = range(random, TRAFFIC.speed * 0.7, TRAFFIC.speed * 1.15);
    car.horizontal = spot.horizontal;
    car.wait = 0;
    cars.push(car);
  }

  function carAhead(car) {
    let best = Infinity;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const ahead = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
      const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
      if (ahead > 0 && ahead < 12 && side < 2.4) best = Math.min(best, ahead);
    }
    return best;
  }

  function step(dt, playerCar) {
    for (const car of cars) {
      // Pause briefly at intersections, like a traffic light.
      const nearJunction =
        ROAD_LINES.some((l) => Math.abs(car.x - l) < 3) && ROAD_LINES.some((l) => Math.abs(car.z - l) < 3);
      if (nearJunction && car.wait <= 0 && Math.random() < 0.01) car.wait = range(Math.random, 1, 2.5);
      if (car.wait > 0) {
        car.wait -= dt;
        car.speed = 0;
        continue;
      }
      const gap = carAhead(car);
      let target = car.cruiseSpeed;
      if (gap < 10) target = 0;
      // Also yield to the player's car right in front.
      if (playerCar) {
        const dx = playerCar.x - car.x;
        const dz = playerCar.z - car.z;
        const ahead = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
        const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
        if (ahead > 0 && ahead < 9 && side < 2.4) target = 0;
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      // Wrap around the city edge onto the opposite side.
      if (car.x > 215) car.x = -215;
      if (car.x < -215) car.x = 215;
      if (car.z > 215) car.z = -215;
      if (car.z < -215) car.z = 215;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
    }
  }

  return { cars, step };
}
