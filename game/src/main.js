// Port Solano — bootstrap, game loop, camera, player on foot and in cars,
// stealing, wanted heat, and the title / pause screens.
// ?shot=cover|chase|street|mission stages a real scene from a fresh world
// and renders it live; ?seed=N fixes the city layout.
import * as THREE from 'three';
import { STEP, WORLD, PLAYER, CAR, POLICE, MISSIONS } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_ENTER_CAR, ACTION_PUNCH, ACTION_PAUSE, ACTION_MISSION } from './input.js';
import { createWorld } from './world.js';
import { createDrivableCar, driveCar, randomCarColor } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const random = createRandom(seed);
const world = createWorld(scene, random);
const hud = createHud();
const minimap = createMinimap();
const audio = createAudio();
const input = createInput(canvas);
const save = loadSave();

function buildPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.05, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.85 }),
  );
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc98d5f, roughness: 0.8 }),
  );
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.7 }),
  );
  cap.position.y = 1.92;
  group.add(cap);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), legMat);
  legL.position.set(-0.17, 0.3, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  group.add(legR);
  scene.add(group);
  return { group, legL, legR };
}

const game = {
  screen: 'title', // title | play | paused
  player: { x: -60, z: 142, heading: Math.PI, walkPhase: 0, mesh: buildPlayerMesh() },
  driving: null, // the car Rico is driving, or null
  parkedCars: [],
  sportCar: null,
  money: save.money,
  wanted: 0,
  wantedTimer: 0,
  autopilot: null, // {target} when a screenshot scene drives itself
  cameraYaw: Math.PI,
  cameraPitch: 0.32,
  time: 0,
};

const traffic = createTraffic(scene, random);
const pedestrians = createPedestrians(scene, random);
const police = createPolice(scene, random);
let missions = createMissions(scene, save);
const combat = createCombat(scene);

function announce(message) {
  statusEl.textContent = message;
}

// Rico's yellow cab, parked by the boardwalk where the story starts.
function spawnParkedCars() {
  const spots = [
    { x: -58, z: 158, heading: Math.PI / 2, color: 0xf1c40f, cab: true },
    { x: 24, z: -24, heading: 0, color: 0x8e44ad, cab: false },
    { x: -24, z: 68, heading: Math.PI, color: 0x2e86c1, cab: false },
    { x: 112, z: 24, heading: -Math.PI / 2, color: 0x1abc9c, cab: false },
    { x: -112, z: -24, heading: Math.PI / 2, color: 0xe67e22, cab: false },
  ];
  for (const spot of spots) {
    const car = createDrivableCar(scene, spot.color, spot.x, spot.z, spot.heading, false, false);
    car.parked = true;
    car.isCab = spot.cab;
    game.parkedCars.push(car);
  }
  // The Sunray GT for mission 2, gleaming in the downtown garage lot.
  game.sportCar = createDrivableCar(scene, 0xd7263d, 66, 22, Math.PI / 2, false, true);
  game.sportCar.parked = true;
  game.parkedCars.push(game.sportCar);
}
spawnParkedCars();

function playerPos() {
  return game.driving ? { x: game.driving.x, z: game.driving.z } : { x: game.player.x, z: game.player.z };
}

function setWanted(stars) {
  game.wanted = Math.max(0, Math.min(5, stars));
  game.wantedTimer = 0;
  hud.setWanted(game.wanted);
}

function addWanted(stars) {
  if (stars > 0) setWanted(game.wanted + stars);
}

function nearestParkedCar(maxDist) {
  const p = playerPos();
  let best = null;
  let bestD = maxDist;
  for (const car of game.parkedCars) {
    const d = Math.hypot(car.x - p.x, car.z - p.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterCar(car) {
  game.driving = car;
  car.parked = false;
  game.parkedCars = game.parkedCars.filter((c) => c !== car);
  game.player.mesh.group.visible = false;
  hud.setHint('WASD drive · E get out · Space is brake (S)');
  announce('Driving.');
}

function exitCar() {
  if (!game.driving) return;
  const car = game.driving;
  game.driving = null;
  game.player.x = car.x - Math.sin(car.heading) * 2.5;
  game.player.z = car.z - Math.cos(car.heading) * 2.5;
  game.player.heading = car.heading;
  game.player.mesh.group.visible = true;
  car.parked = true;
  game.parkedCars.push(car);
  hud.setHint('WASD walk · E enter car · F punch');
  announce('On foot.');
}

function tryEnterOrSteal() {
  if (game.driving) {
    exitCar();
    return;
  }
  const car = nearestParkedCar(4.5);
  if (!car) return;
  const mission = missions.current();
  if (car === game.sportCar && mission && mission.id === 'hot-wheels') {
    // Stealing the GT is the mission — the alarm brings the heat.
    const result = missions.interact(playerPos(), false);
    if (result.event === 'steal') {
      addWanted(result.wantedBump);
      hud.toast('STOLEN! The Sunray GT is yours — lose the cops!', 4);
      audio.pickup();
    }
  } else if (car === game.sportCar) {
    hud.toast('That Sunray GT belongs to the garage — not your job yet.', 3);
    audio.denied();
    return;
  } else if (!car.isCab) {
    addWanted(1);
    hud.toast('Car stolen! Solano PD is on the way.', 3);
    audio.pickup();
  }
  enterCar(car);
}

function interactMission() {
  const mission = missions.current();
  if (!mission) return;
  const result = missions.interact(playerPos(), !!game.driving);
  if (result.event === 'needcar') {
    hud.toast('Get in a car first — the fare rides, not walks.', 3);
    audio.denied();
    return;
  }
  if (result.event === 'pickup') {
    hud.toast(mission.id === 'first-fare' ? 'Fare aboard! Drive to the night market.' : 'Package secured. Move!', 3);
    audio.pickup();
    return;
  }
  if (result.event === 'deliver') {
    const reward = missions.completeMission();
    game.money += reward;
    save.money = game.money;
    save.missionIndex = missions.index;
    writeSave(save);
    hud.setMoney(game.money);
    hud.toast(`JOB DONE — +$${reward}!`, 4);
    audio.missionDone();
    announce(`Mission complete. Earned $${reward}.`);
    if (missions.allDone) hud.toast('ALL JOBS DONE — Rico is free! Free roam.', 5);
  }
}

function stepPlayer(dt) {
  const p = game.player;
  const mouse = input.consumeMouse();
  game.cameraYaw -= mouse.dx * 0.0032;
  game.cameraPitch = Math.max(0.08, Math.min(0.85, game.cameraPitch + mouse.dy * 0.002));
  if (game.driving) {
    if (game.autopilot) return; // the autopilot already drove this step
    const before = game.driving.speed;
    driveCar(game.driving, input, dt, world.resolveCollision);
    // Ramming a traffic car or a pedestrian at speed draws heat.
    for (const car of traffic.cars) {
      const d = Math.hypot(car.x - game.driving.x, car.z - game.driving.z);
      if (d < 3.2 && Math.abs(before) > 12) {
        addWanted(1);
        audio.crash();
        game.driving.speed *= 0.4;
        car.speed = 0;
      }
    }
    for (const w of pedestrians.walkers) {
      const d = Math.hypot(w.x - game.driving.x, w.z - game.driving.z);
      if (d < 2.2 && Math.abs(before) > 6) {
        addWanted(1);
        w.flee = 3;
        audio.crash();
      }
    }
    audio.setEngine(Math.abs(game.driving.speed) / CAR.maxSpeed, true);
    return;
  }
  audio.setEngine(0, false);
  const run = input.isHeld('run');
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const fwd = (input.isHeld('forward') ? 1 : 0) - (input.isHeld('back') ? 1 : 0);
  const strafe = (input.isHeld('right') ? 1 : 0) - (input.isHeld('left') ? 1 : 0);
  // Movement is relative to the camera yaw.
  const sin = Math.sin(game.cameraYaw);
  const cos = Math.cos(game.cameraYaw);
  const mx = sin * fwd + cos * strafe;
  const mz = cos * fwd - sin * strafe;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const nx = p.x + (mx / len) * speed * dt;
    const nz = p.z + (mz / len) * speed * dt;
    const pos = world.resolveCollision({ x: nx, z: nz }, PLAYER.radius);
    p.x = pos.x;
    p.z = pos.z;
    p.heading = Math.atan2(mx / len, mz / len);
    p.walkPhase += dt * speed * 1.6;
    p.mesh.legL.rotation.x = Math.sin(p.walkPhase) * 0.7;
    p.mesh.legR.rotation.x = -Math.sin(p.walkPhase) * 0.7;
  } else {
    p.mesh.legL.rotation.x *= 0.8;
    p.mesh.legR.rotation.x *= 0.8;
  }
  p.mesh.group.position.set(p.x, 0, p.z);
  p.mesh.group.rotation.y = p.heading;
}

function updateCamera(dt) {
  const focus = game.driving
    ? { x: game.driving.x, z: game.driving.z, heading: game.driving.heading }
    : { x: game.player.x, z: game.player.z, heading: game.cameraYaw };
  const dist = game.driving ? 12 : 9.5;
  const height = game.driving ? 5 : 4.2;
  const yaw = game.driving ? focus.heading : game.cameraYaw;
  const tx = focus.x - Math.sin(yaw) * dist;
  const tz = focus.z - Math.cos(yaw) * dist;
  const k = 1 - Math.exp(-dt * 6);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(focus.x, 1.6, focus.z);
}

function updateWanted(dt) {
  if (game.wanted === 0) return;
  // Heat fades when no cruiser is close enough to see Rico.
  const p = playerPos();
  let nearest = Infinity;
  for (const car of police.cruisers) nearest = Math.min(nearest, Math.hypot(car.x - p.x, car.z - p.z));
  if (nearest > 55) {
    game.wantedTimer += dt;
    if (game.wantedTimer > POLICE.coolDownPerStar) {
      game.wantedTimer = 0;
      setWanted(game.wanted - 1);
      if (game.wanted === 0) hud.toast('You lost them. Heat is off.', 3);
    }
  } else {
    game.wantedTimer = 0;
  }
}

function stepWorld(dt) {
  game.time += dt;
  // Autopilot (screenshot staging) steers toward the mission marker.
  if (game.autopilot) {
    const target = game.autopilot.target;
    const p = playerPos();
    const wantHeading = Math.atan2(target.x - p.x, target.z - p.z);
    if (game.driving) {
      const car = game.driving;
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const fake = {
        isHeld: (a) => (a === 'forward' ? true : a === 'left' ? diff < -0.05 : a === 'right' ? diff > 0.05 : false),
      };
      driveCar(car, fake, dt, world.resolveCollision);
    } else {
      // On foot: walk straight toward the marker.
      game.cameraYaw = wantHeading;
      const p2 = game.player;
      const step = 7 * dt;
      const pos = world.resolveCollision({ x: p2.x + Math.sin(wantHeading) * step, z: p2.z + Math.cos(wantHeading) * step }, PLAYER.radius);
      p2.x = pos.x;
      p2.z = pos.z;
      p2.heading = wantHeading;
      p2.walkPhase += dt * 10;
      p2.mesh.legL.rotation.x = Math.sin(p2.walkPhase) * 0.7;
      p2.mesh.legR.rotation.x = -Math.sin(p2.walkPhase) * 0.7;
      p2.mesh.group.position.set(p2.x, 0, p2.z);
      p2.mesh.group.rotation.y = p2.heading;
    }
  }
  stepPlayer(dt);
  traffic.step(dt, game.driving);
  const allCars = [...traffic.cars, ...game.parkedCars, ...police.cruisers];
  if (game.driving) allCars.push(game.driving);
  pedestrians.step(dt, playerPos(), allCars);
  police.step(dt, playerPos(), game.wanted, world.resolveCollision);
  missions.step(dt);
  combat.step(dt, game.player, pedestrians);
  updateWanted(dt);
  audio.setSiren(game.wanted > 0, dt);
  hud.setMission(missions.statusText(playerPos()));
  hud.setSpeed(game.driving ? game.driving.speed * 3.6 : 0, !!game.driving);
  hud.step(dt);
  minimap.draw({
    player: { x: playerPos().x, z: playerPos().z, heading: game.driving ? game.driving.heading : game.player.heading },
    trafficCars: traffic.cars,
    policeCars: police.cruisers,
    target: missions.target(),
  });
  updateCamera(dt);
}

function render() {
  renderer.render(scene, camera);
}

function startGame() {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
  game.screen = 'play';
  audio.unlock();
  hud.setMoney(game.money);
  hud.setWanted(game.wanted);
  hud.setMission(missions.statusText(playerPos()));
  hud.toast(missions.current() ? missions.current().briefing : 'Free roam — Port Solano is yours.', 5);
  announce('Playing Port Solano.');
}

function pauseGame() {
  game.screen = 'paused';
  const list = MISSIONS.map((m, i) => `${i < missions.index ? '✓' : i === missions.index ? '▶' : '·'} ${m.title} — $${m.reward}`).join('<br>');
  document.getElementById('pause-missions').innerHTML = `Rico Vega — $${Math.round(game.money)}<br><br>${list}`;
  document.getElementById('pause-screen').classList.remove('hidden');
  audio.setEngine(0, false);
  audio.setSiren(false, 0);
  announce('Paused.');
}

document.getElementById('btn-play').addEventListener('click', () => {
  audio.unlock();
  startGame();
});
document.getElementById('btn-resume').addEventListener('click', () => {
  document.getElementById('pause-screen').classList.add('hidden');
  game.screen = 'play';
});
document.getElementById('btn-restart').addEventListener('click', () => {
  clearSave();
  window.location.reload();
});
const saveNow = loadSave();
if (saveNow.missionIndex > 0 || saveNow.money !== 40) {
  const btn = document.getElementById('btn-continue');
  btn.classList.remove('hidden');
  document.getElementById('continue-job').textContent = String(Math.min(saveNow.missionIndex + 1, 3));
  btn.addEventListener('click', () => {
    audio.unlock();
    startGame();
  });
}

// Shot staging API used by shots.js: teleport, wanted, mission, car.
game.api = {
  teleport(x, z, heading) {
    if (game.driving) exitCar();
    game.player.x = x;
    game.player.z = z;
    game.player.heading = heading;
    game.cameraYaw = heading;
    game.player.mesh.group.position.set(x, 0, z);
    game.player.mesh.group.rotation.y = heading;
    camera.position.set(x - Math.sin(heading) * 9, 4, z - Math.cos(heading) * 9);
  },
  giveCar(color, x, z, heading, sport) {
    if (game.driving) exitCar();
    const car = createDrivableCar(scene, color, x, z, heading, false, !!sport);
    enterCar(car);
    return car;
  },
  setMission(index) {
    missions = createMissions(scene, { missionIndex: index });
  },
  setWanted,
  setMoney(value) {
    game.money = value;
    hud.setMoney(value);
  },
  setAutopilot(target) {
    game.autopilot = target ? { target } : null;
  },
  // Snap the chase camera to its final framing at once. Under headless
  // virtual time only ~10-35 sim steps actually run before the screenshot,
  // so the lerped camera never converges — staging must be correct on the
  // very first rendered frame, not after seconds of driving.
  snapCamera() {
    const focus = game.driving
      ? { x: game.driving.x, z: game.driving.z, heading: game.driving.heading }
      : { x: game.player.x, z: game.player.z, heading: game.cameraYaw };
    const dist = game.driving ? 12 : 9.5;
    const height = game.driving ? 5 : 4.2;
    camera.position.set(focus.x - Math.sin(focus.heading) * dist, height, focus.z - Math.cos(focus.heading) * dist);
    camera.lookAt(focus.x, 1.6, focus.z);
  },
  toast: (m, s) => hud.toast(m, s),
  get player() {
    return game.player;
  },
  get driving() {
    return game.driving;
  },
};

// The mission tracker is a closure; shots jump to a job by rebuilding it.
function setMissionForShot(index) {
  missions = createMissions(scene, { missionIndex: index });
  return missions;
}

// Main loop: fixed 1/60 s steps, render every frame.
let last = performance.now();
let accumulator = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const frameDt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (game.screen !== 'play') {
    render();
    return;
  }
  if (input.wasPressed(ACTION_PAUSE)) {
    pauseGame();
    input.endFrame();
    render();
    return;
  }
  if (input.wasPressed(ACTION_ENTER_CAR)) tryEnterOrSteal();
  if (input.wasPressed(ACTION_MISSION)) {
    const m = missions.current();
    hud.toast(m ? m.briefing : 'All jobs done — free roam!', 5);
  }
  if (input.wasPressed(ACTION_PUNCH) && !game.driving) {
    const result = combat.punch(game.player, pedestrians);
    if (result === 'hit') {
      addWanted(1);
      audio.punch();
      hud.toast('Assault! The PD saw that.', 2);
    } else if (result === 'miss') {
      audio.punch();
    }
  }
  // E near a mission marker also counts as the mission interaction.
  if (input.wasPressed(ACTION_ENTER_CAR)) interactMission();
  accumulator += frameDt;
  while (accumulator >= STEP) {
    stepWorld(STEP);
    accumulator -= STEP;
  }
  render();
  input.endFrame();
}

// Screenshot mode: stage the scene from a fresh world, then keep the loop
// running (autopilot drives) so the frame is a live render.
if (shotName) {
  game.screen = 'play';
  document.getElementById('title-screen').classList.add('hidden');
  const staged = stageShot(shotName, game, { setMissionForShot, traffic, police, pedestrians });
  void staged;
  // Frozen composition: no autopilot driving (the step count before the
  // screenshot is unpredictable under virtual time), camera snapped to
  // its final framing now. Traffic, pedestrians and police still animate
  // around the frozen subjects; staged cruisers/walkers hold their marks.
  game.api.setAutopilot(null);
  game.api.snapCamera();
  hud.setMoney(game.money);
  hud.setWanted(game.wanted);
  let painted = 0;
  const paintLoop = () => {
    stepWorld(STEP);
    render();
    painted += 1;
    // v2: 90 steps (1.5 s) only — under virtual-time the frame count is
    // what the screenshot actually gets, and a short run keeps the staged
    // subjects near their marks instead of driving ~100 m past them.
    if (painted < 90) requestAnimationFrame(paintLoop);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paintLoop);
} else {
  // Idle title backdrop: slow orbit over the city.
  camera.position.set(0, 60, 160);
  camera.lookAt(0, 0, 0);
  requestAnimationFrame(loop);
}
