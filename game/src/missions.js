// The story: Rico Vega's three jobs. Each mission is a small state machine
// — go to a marker, press E, then reach the next one — with a glowing
// beacon in the world and a distance readout on the HUD.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

function makeBeacon(scene) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  beam.position.y = 20;
  group.add(beam);
  group.visible = false;
  scene.add(group);
  return group;
}

export function createMissions(scene, save) {
  const beacon = makeBeacon(scene);
  let index = Math.max(0, Math.min(save.missionIndex, MISSIONS.length - 1));
  let phase = 'go'; // go | carry | done
  let allDone = save.missionIndex >= MISSIONS.length;
  let pulse = 0;

  function current() {
    return allDone ? null : MISSIONS[index];
  }

  // The marker the player must reach right now.
  function target() {
    const m = current();
    if (!m) return null;
    if (m.id === 'first-fare') return phase === 'go' ? m.pickup : m.dropoff;
    if (m.id === 'hot-wheels') return phase === 'go' ? m.steal : m.escape;
    return phase === 'go' ? m.pickup : m.dropoff;
  }

  function statusText(playerPos) {
    const m = current();
    if (!m) return 'All jobs done — Port Solano is yours, Rico. Free roam!';
    const t = target();
    const dist = Math.round(Math.hypot(t.x - playerPos.x, t.z - playerPos.z));
    const verb =
      m.id === 'first-fare'
        ? phase === 'go'
          ? 'Pick up the fare at the boardwalk'
          : 'Drive the fare to the night market'
        : m.id === 'hot-wheels'
          ? phase === 'go'
            ? 'Steal the Sunray GT (press E)'
            : 'Lose the cops — reach the old garage'
          : phase === 'go'
            ? 'Grab the package (press E)'
            : 'Deliver the package to Pier 9';
    return `${m.title} — ${verb} · ${dist}m`;
  }

  // Called when the player presses E near the marker. Returns an event name
  // ('pickup' | 'deliver' | 'none') plus whether the wanted level should rise.
  function interact(playerPos, inCar) {
    const m = current();
    if (!m) return { event: 'none', wantedBump: 0 };
    const t = target();
    const dist = Math.hypot(t.x - playerPos.x, t.z - playerPos.z);
    if (dist > 5) return { event: 'none', wantedBump: 0 };
    if (m.id === 'first-fare') {
      if (phase === 'go') {
        if (!inCar) return { event: 'needcar', wantedBump: 0 };
        phase = 'carry';
        return { event: 'pickup', wantedBump: 0 };
      }
      phase = 'done';
      return { event: 'deliver', wantedBump: 0 };
    }
    if (m.id === 'hot-wheels') {
      if (phase === 'go') {
        phase = 'carry';
        return { event: 'steal', wantedBump: 2 };
      }
      phase = 'done';
      return { event: 'deliver', wantedBump: 0 };
    }
    // the-drop
    if (phase === 'go') {
      phase = 'carry';
      return { event: 'pickup', wantedBump: 0 };
    }
    phase = 'done';
    return { event: 'deliver', wantedBump: 0 };
  }

  // Advance to the next mission after a delivery. Returns the reward paid.
  function completeMission() {
    const m = current();
    if (!m) return 0;
    const reward = m.reward;
    index += 1;
    phase = 'go';
    if (index >= MISSIONS.length) allDone = true;
    return reward;
  }

  function step(dt) {
    pulse += dt;
    const t = target();
    if (!t) {
      beacon.visible = false;
      return;
    }
    beacon.visible = true;
    beacon.position.set(t.x, 0, t.z);
    const s = 1 + Math.sin(pulse * 4) * 0.12;
    beacon.scale.set(s, 1, s);
  }

  return {
    current,
    target,
    statusText,
    interact,
    completeMission,
    step,
    // Staging only: jump a mission to its second leg (after the pickup).
    setPhase(p) {
      phase = p;
    },
    get index() {
      return index;
    },
    get allDone() {
      return allDone;
    },
  };
}
