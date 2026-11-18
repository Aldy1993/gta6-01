// Screenshot staging: each ?shot= name sets the game to a deterministic
// scene from a fresh world, then the main loop keeps rendering it live —
// so every screenshot is a real render of the game's own code, never a
// composite.
//
// v2 lesson, learned the hard way: under headless virtual time only
// ~10-35 sim steps actually run before the screenshot is taken, so the
// composition must be correct on the FIRST rendered frame. main.js snaps
// the camera to its final framing and freezes the player (no autopilot
// driving); this file therefore places every subject exactly where the
// finished frame needs it, and police / pedestrians are frozen on their
// mark (placeCruiser / placeWalker) so the run cannot carry them away.
import { MISSIONS } from './config.js';

// Place the player in a cab on the downtown avenue at sunset, traffic
// around, mission 1 on the HUD.
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
  game.api.toast('PORT SOLANO — Rico Vega', 5);
}

// A three-star chase: police cruisers closing in, sirens up. The GT sits
// at x=-60 heading east; the two frozen cruisers wait just ahead of it,
// head-on, light bars flashing — close enough to fill the frame.
function stageChase(game, ctx) {
  const m = ctx.setMissionForShot(1);
  m.setPhase('carry');
  game.api.setMoney(685);
  game.api.setWanted(3);
  const car = game.api.giveCar(0xd7263d, -60, 22, Math.PI / 2, true);
  void car;
  // Two cruisers ahead of the GT, facing it head-on down the avenue.
  ctx.police.placeCruiser(-45, 18.5, -Math.PI / 2);
  ctx.police.placeCruiser(-38, 25.5, -Math.PI / 2);
  game.api.toast('WANTED — Lose the Solano PD!', 5);
}

// On foot at the boardwalk night market, pedestrians strolling, the gold
// mission beacon ahead. Rico stands at (-60, 142) facing north; six
// frozen walkers wait on the sidewalk just ahead of him, several facing
// back toward the camera.
function stageStreet(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(40);
  game.api.setWanted(0);
  game.api.teleport(-60, 142, Math.PI);
  const spots = [
    [-70, 128, 0.3],
    [-58, 132, -0.4],
    [-68, 135, 0.1],
    [-60, 126, 0.2],
    [-64, 136, 3.0],
    [-73, 123, 0.5],
  ];
  for (const [x, z, heading] of spots) ctx.pedestrians.placeWalker(x, z, heading);
  game.api.toast('First Fare — pick up the passenger', 5);
}

// Mission 3 in progress: the package run to Pier 9, two stars, PD behind.
// The car sits ON the pier deck, pointed south at the beacon — planks,
// posts, lamps, the moored boat and the sea ahead, beacon at the pier end.
function stageMission(game, ctx) {
  const m = ctx.setMissionForShot(2);
  m.setPhase('carry');
  game.api.setMoney(1120);
  game.api.setWanted(2);
  // On the pier, already pointed at the drop point.
  game.api.giveCar(0x2e86c1, -210, 190, 0, false);
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
