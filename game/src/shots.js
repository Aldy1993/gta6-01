// Screenshot staging: each ?shot= name sets the game to a deterministic
// scene from a fresh world, then the main loop keeps rendering it live
// (autopilot drives toward the mission marker) — so every screenshot is a
// real render of the game's own code, never a composite.
//
// v2 lesson: the shot loop runs only 90 steps (1.5 s of sim) before the
// frame is taken, so staged subjects are placed a short, predictable hop
// ahead of the player's start — a car covers ~20 m, a walker ~10 m — and
// police / pedestrians are frozen on their mark (placeCruiser /
// placeWalker) so the run cannot carry them out of frame.
import { MISSIONS } from './config.js';

// Place the player in a cab on the downtown avenue at sunset, traffic
// around, mission 1 on the HUD. The cab moves ~20 m north in the 90-step
// run, so traffic is staged just ahead of its start.
function stageCover(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(240);
  game.api.setWanted(0);
  // Avenue x=22 heading north into downtown, sunset ahead.
  game.api.giveCar(0xf1c40f, 22, 120, Math.PI, false);
  // Traffic cars on the same avenue, ahead of the cab.
  const spots = [
    { x: 19.2, z: 80, heading: Math.PI },
    { x: 24.8, z: 50, heading: 0 },
    { x: 19.2, z: 20, heading: Math.PI },
  ];
  ctx.traffic.cars.slice(0, 3).forEach((car, i) => {
    car.x = spots[i].x;
    car.z = spots[i].z;
    car.heading = spots[i].heading;
    car.speed = 7;
    car.horizontal = false;
  });
  game.api.setAutopilot({ x: 22, z: -180 });
  game.api.toast('PORT SOLANO — Rico Vega', 5);
}

// A three-star chase: police cruisers closing in, sirens up. The GT moves
// ~20 m east in the 90-step run (ends near x=-40), so the two frozen
// cruisers wait just ahead of it, head-on, light bars flashing — close
// enough to fill the frame.
function stageChase(game, ctx) {
  const m = ctx.setMissionForShot(1);
  m.setPhase('carry');
  game.api.setMoney(685);
  game.api.setWanted(3);
  const car = game.api.giveCar(0xd7263d, -60, 22, Math.PI / 2, true);
  void car;
  // Two cruisers ahead of the GT, facing it head-on down the avenue.
  ctx.police.placeCruiser(-25, 18.5, -Math.PI / 2);
  ctx.police.placeCruiser(-12, 25.5, -Math.PI / 2);
  game.api.setAutopilot({ x: 154, z: 22 });
  game.api.toast('WANTED — Lose the Solano PD!', 5);
}

// On foot at the boardwalk night market, pedestrians strolling, the gold
// mission beacon ahead. Rico walks ~10 m north in the 90-step run (ends
// near z=132), so six frozen walkers wait on the sidewalk just ahead of
// him, several facing back toward the camera.
function stageStreet(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(40);
  game.api.setWanted(0);
  game.api.teleport(-60, 142, Math.PI);
  const spots = [
    [-70, 120, 0.3],
    [-58, 124, -0.4],
    [-68, 127, 0.1],
    [-60, 118, 0.2],
    [-64, 128, 3.0],
    [-73, 115, 0.5],
  ];
  for (const [x, z, heading] of spots) ctx.pedestrians.placeWalker(x, z, heading);
  game.api.setAutopilot({ x: -66, z: 100 });
  game.api.toast('First Fare — pick up the passenger', 5);
}

// Mission 3 in progress: the package run to Pier 9, two stars, PD behind.
// The car starts ON the pier approach and rolls ~20 m south in the
// 90-step run, ending on the pier deck itself — planks, posts, lamps, the
// moored boat and the sea ahead, beacon at the pier end.
function stageMission(game, ctx) {
  const m = ctx.setMissionForShot(2);
  m.setPhase('carry');
  game.api.setMoney(1120);
  game.api.setWanted(2);
  // Start on the harbour approach, already pointed down Pier 9.
  game.api.giveCar(0x2e86c1, -210, 170, 0, false);
  game.api.setAutopilot({ x: -210, z: 250 });
  game.api.toast('The Drop — deliver the package to Pier 9', 5);
}

export function stageShot(name, game, ctx) {
  if (name === 'chase') stageChase(game, ctx);
  else if (name === 'street') stageStreet(game, ctx);
  else if (name === 'mission') stageMission(game, ctx);
  else stageCover(game, ctx);
  return { shot: name };
}

export const SHOT_NAMES = ['cover', 'chase', 'street', 'mission'];
export const SHOT_MISSIONS = MISSIONS;
