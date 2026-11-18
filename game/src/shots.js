// Screenshot staging: each ?shot= name sets the game to a deterministic
// scene from a fresh world, then the main loop keeps rendering it live
// (autopilot drives toward the mission marker) — so every screenshot is a
// real render of the game's own code, never a composite.
import { MISSIONS } from './config.js';

// Place the player in a cab on the downtown avenue at sunset, traffic
// around, mission 1 on the HUD.
function stageCover(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(240);
  game.api.setWanted(0);
  // Avenue x=22 heading north into downtown, sunset ahead.
  game.api.giveCar(0xf1c40f, 22, 120, Math.PI, false);
  // Pull three traffic cars onto the same avenue, ahead of the cab, so the
  // frame reads busy as it cruises downtown.
  const spots = [
    { x: 19.2, z: 40, heading: Math.PI },
    { x: 24.8, z: 10, heading: 0 },
    { x: 19.2, z: -20, heading: Math.PI },
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

// A three-star chase: police cruisers closing in, sirens up.
function stageChase(game, ctx) {
  const m = ctx.setMissionForShot(1);
  m.setPhase('carry');
  game.api.setMoney(685);
  game.api.setWanted(3);
  const car = game.api.giveCar(0xd7263d, -20, 22, Math.PI / 2, true);
  void car;
  // Two cruisers ahead of the GT, headlights on, so the chase is in frame.
  ctx.police.placeCruiser(35, 34, -Math.PI / 2);
  ctx.police.placeCruiser(60, 10, -Math.PI / 2);
  game.api.setAutopilot({ x: -154, z: -154 });
  game.api.toast('WANTED — Lose the Solano PD!', 5);
}

// On foot at the boardwalk night market, pedestrians strolling, the gold
// mission beacon ahead.
function stageStreet(game, ctx) {
  ctx.setMissionForShot(0);
  game.api.setMoney(40);
  game.api.setWanted(0);
  game.api.teleport(-60, 142, Math.PI);
  game.api.setAutopilot({ x: -66, z: 150 });
  game.api.toast('First Fare — pick up the passenger', 5);
}

// Mission 3 in progress: the package run to Pier 9, two stars, PD behind.
function stageMission(game, ctx) {
  const m = ctx.setMissionForShot(2);
  m.setPhase('carry');
  game.api.setMoney(1120);
  game.api.setWanted(2);
  // Start on the harbour road, already pointed at Pier 9.
  game.api.giveCar(0x2e86c1, -120, 154, -Math.PI / 2, false);
  game.api.setAutopilot({ x: -198, z: 198 });
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
