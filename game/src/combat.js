// On-foot combat: a short punch with a cooldown. Hitting a pedestrian
// knocks them fleeing and draws a wanted star — Solano PD notices assault.
import * as THREE from 'three';
import { PLAYER } from './config.js';

export function createCombat(scene) {
  // A visible fist swing: a small box that flashes out in front of the player.
  const fist = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 }),
  );
  fist.visible = false;
  scene.add(fist);
  let cooldown = 0;
  let swing = 0;

  function step(dt, player, pedestrians, onAssault) {
    cooldown = Math.max(0, cooldown - dt);
    if (swing > 0) {
      swing -= dt;
      const reach = 0.8 + (0.45 - Math.max(0, swing)) * 2.4;
      fist.position.set(
        player.x + Math.sin(player.heading) * reach,
        1.2,
        player.z + Math.cos(player.heading) * reach,
      );
      fist.rotation.y = player.heading;
      if (swing <= 0) fist.visible = false;
    }
    return cooldown;
  }

  // Attempt a punch. Returns 'hit' | 'miss' | 'cooling'.
  function punch(player, pedestrians) {
    if (cooldown > 0) return 'cooling';
    cooldown = PLAYER.punchCooldown;
    swing = 0.28;
    fist.visible = true;
    const victim = pedestrians.nearestTo(
      player.x + Math.sin(player.heading) * 1.4,
      player.z + Math.cos(player.heading) * 1.4,
      PLAYER.punchRange,
    );
    if (victim) {
      victim.flee = 3;
      return 'hit';
    }
    return 'miss';
  }

  return { step, punch };
}
