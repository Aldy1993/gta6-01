// Screenshot staging: each ?shot= name sets the game to a deterministic
// scene from a fresh world, then the main loop keeps rendering it live —
// so every screenshot is a real render of the game's own code, never a
// composite.
//
// v3 lesson: under headless virtual time only ~10-35 rAF frames run before
// the screenshot, so rAF-driven staging can never get a car up to speed.
// Each stage therefore returns { preSteps, drive }: main.js pre-steps the
// live sim synchronously that many fixed steps BEFORE the first render,
// with the autopilot driving straight along the shot's road toward `drive`.
// The speedometer then reads the car's REAL sim speed (accel + drag, never
// a faked number), traffic is rolling and Rico is walking. The paint tail
// after the pre-step is short (15 steps) so the staged subjects cannot be
// carried out of their marks — past the cruisers on the chase, or off the
// pier end on the mission.
//
// Lane note: staged traffic sits 4 units off the player's centre line
// (x=18/26 on the x=22 avenue). The ram check fires under 3.2 units, so
// the player overtakes them cleanly with no speed cut and no wanted stars.
import { MISSIONS } from './config.js';

// Place the player in a cab on the downtown avenue at sunset, traffic
// around, mission 1 on the HUD. The cab drives north up the avenue;
// traffic in the road-edge lanes is overtaken, never rammed.
function stageCover(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(240);
  game.api.setWanted(0);
  // Avenue x=22 heading north into downtown, sunset ahead.
  game.api.giveCar(0xf1c40f, 22, 120, Math.PI, false);
  // Traffic cars on the same avenue, ahead of the cab, in the edge lanes.
  const spots = [
    { x: 18, z: 80, heading: Math.PI },
    { x: 26, z: 50, heading: 0 },
    { x: 18, z: 20, heading: Math.PI },
  ];
  ctx.traffic.cars.slice(0, 3).forEach((car, i) => {
    car.x = spots[i].x;
    car.z = spots[i].z;
    car.heading = spots[i].heading;
    car.speed = 7;
    car.horizontal = false;
  });
  game.api.toast('PORT SOLANO — Rico Vega', 5);
  // 180 steps (3 s): cab up to ~110 km/h, ~60 units up the avenue.
  return { preSteps: 180, drive: { x: 22, z: -380 } };
}

// A three-star chase: police cruisers closing in, sirens up. The GT sits
// at x=-60 heading east; two cruisers wait just ahead of it, head-on in
// the avenue lanes, light bars flashing — close enough to fill the frame.
// Short pre-step on purpose: a long run would carry the GT straight
// through the cruisers.
function stageChase(game, ctx) {
  const m = ctx.setMissionForShot(1);
  m.setPhase('carry');
  game.api.setMoney(685);
  game.api.setWanted(3);
  const car = game.api.giveCar(0xd7263d, -60, 22, Math.PI / 2, true);
  void car;
  // Two cruisers ahead of the GT, facing it head-on down the avenue.
  ctx.police.placeCruiser(-40, 18.5, -Math.PI / 2);
  ctx.police.placeCruiser(-33, 25.5, -Math.PI / 2);
  game.api.toast('WANTED — Lose the Solano PD!', 5);
  // 60 steps (1 s): GT at ~60 km/h and rising, cruisers still 6-13 ahead.
  return { preSteps: 60, drive: { x: 380, z: 22 } };
}

// On foot at the boardwalk night market, pedestrians strolling, the gold
// mission beacon ahead. Rico stands at (-60, 142) facing north; six
// walkers wait on the sidewalk just ahead of him, several facing back
// toward the camera. Rico walks north past them, toward the market.
function stageStreet(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(40);
  game.api.setWanted(0);
  game.api.teleport(-60, 142, Math.PI);
  const spots = [
    [-70, 128, 0.3],
    [-58, 132, -0.4],
    [-68, 135, 0.1],
    [-56, 126, 0.2],
    [-64, 136, 3.0],
    [-73, 123, 0.5],
  ];
  for (const [x, z, heading] of spots) ctx.pedestrians.placeWalker(x, z, heading);
  game.api.toast('First Fare — pick up the passenger', 5);
  // 120 steps (2 s): Rico walks ~14 units north, into the crowd.
  return { preSteps: 120, drive: { x: -60, z: 100 } };
}

// Mission 3 in progress: the package run to Pier 9, two stars, PD behind.
// The car sits ON the pier deck, pointed south at the beacon — planks,
// posts, lamps, the moored boat and the sea ahead, beacon at the pier end.
// A cruiser is staged ON the deck ahead of the car (not at the water's
// edge): the chase followed Rico onto the pier.
function stageMission(game, ctx) {
  const m = ctx.setMissionForShot(2);
  m.setPhase('carry');
  game.api.setMoney(1120);
  game.api.setWanted(2);
  // On the pier, already pointed at the drop point.
  game.api.giveCar(0x2e86c1, -210, 190, 0, false);
  // Cruiser on the deck, left lane, facing the car head-on.
  ctx.police.placeCruiser(-213.5, 240, Math.PI);
  game.api.toast('The Drop — deliver the package to Pier 9', 5);
  // 60 steps (1 s): car at ~60 km/h and rising, still well up the pier.
  return { preSteps: 60, drive: { x: -210, z: 238 } };
}

export function stageShot(name, game, ctx) {
  if (name === 'chase') return stageChase(game, ctx);
  if (name === 'street') return stageStreet(game, ctx);
  if (name === 'mission') return stageMission(game, ctx);
  return stageCover(game, ctx);
}

export const SHOT_NAMES = ['cover', 'chase', 'street', 'mission'];
export const SHOT_MISSIONS = MISSIONS;
