// Side gig: Solano Packages. Eight sealed parcels are stashed around the
// city — on sidewalks, at the market, one out on the pier. Walk or drive
// over one to grab it: +$25 and a tick on the HUD counter. It is a small
// open-world loop beside the three story jobs: free-roam has something to
// hunt even after the missions are done. Collected parcels persist in the
// save, so the hunt survives a reload.
import * as THREE from 'three';

export const PACKAGE_VALUE = 25;

const SPOTS = [
  { x: 30.5, z: 100 }, // downtown avenue sidewalk
  { x: -57.5, z: -22 }, // west avenue sidewalk
  { x: 118.5, z: 66 }, // market district sidewalk
  { x: -101.5, z: 154 }, // boardwalk west
  { x: 74.5, z: -110 }, // north avenue sidewalk
  { x: -22, z: -101.5 }, // near the north depot
  { x: 162.5, z: -66 }, // east avenue sidewalk
  { x: -210, z: 170 }, // out on Pier 9
];

function makePackageMesh() {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xc98a2b, roughness: 0.7 }),
  );
  box.position.y = 0.75;
  box.castShadow = true;
  group.add(box);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.22, 0.94),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xaa7711, emissiveIntensity: 0.7, roughness: 0.5 }),
  );
  band.position.y = 0.75;
  group.add(band);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);
  return group;
}

export function createCollectibles(scene, save) {
  const taken = new Set(Array.isArray(save.packages) ? save.packages : []);
  const items = SPOTS.map((spot, i) => {
    const group = makePackageMesh();
    group.position.set(spot.x, 0, spot.z);
    group.visible = !taken.has(i);
    scene.add(group);
    return { ...spot, index: i, group, phase: i * 1.3, got: taken.has(i) };
  });

  function step(dt, playerPos, onCollect) {
    for (const item of items) {
      if (item.got) continue;
      // Spin and bob so the parcel reads as a pickup, not street clutter.
      item.phase += dt * 2.4;
      item.group.rotation.y = item.phase;
      item.group.position.y = Math.sin(item.phase * 1.6) * 0.12;
      const d = Math.hypot(item.group.position.x - playerPos.x, item.group.position.z - playerPos.z);
      if (d < 2.5) {
        item.got = true;
        item.group.visible = false;
        onCollect(PACKAGE_VALUE);
      }
    }
  }

  return {
    step,
    total: SPOTS.length,
    get count() {
      return items.filter((i) => i.got).length;
    },
    collected() {
      return items.filter((i) => i.got).map((i) => i.index);
    },
  };
}
