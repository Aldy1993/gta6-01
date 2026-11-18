// Port Solano itself: the ground, road grid, downtown towers, the harbour
// pier, the neon night market, palms and street lamps. Also owns the
// building footprints every other system uses for collision.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createRandom, pick, range } from './random.js';

// Roads run on a grid: road centre lines at these coordinates.
export const ROAD_LINES = [-154, -110, -66, -22, 22, 66, 110, 154];

function windowTexture(random, base, lit) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  // A few darker floors near the base so towers read as stacked storeys.
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 104, 64, 24);
  for (let y = 6; y < 124; y += 12) {
    for (let x = 6; x < 60; x += 12) {
      const r = random();
      g.fillStyle = r < 0.62 ? lit : r < 0.8 ? '#ffd98a' : '#22303f';
      g.fillRect(x, y, 7, 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBuilding(random, x, z, w, d, h, texture, roofColor) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Rooftop rim light so towers read at sunset.
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
    new THREE.MeshStandardMaterial({ color: roofColor, emissive: 0xaa6622, emissiveIntensity: 0.45 }),
  );
  rim.position.set(x, h + 0.4, z);
  // Rooftop plant box so roofs are not flat slabs.
  const plant = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(w, d) * 0.35, 1.6, Math.min(w, d) * 0.35),
    new THREE.MeshStandardMaterial({ color: 0x5a6a72, roughness: 0.9 }),
  );
  plant.position.set(x + w * 0.2, h + 1.4, z - d * 0.18);
  return { mesh, rim, plant, box: { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 } };
}

function makePalm(x, z) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.35, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6b46, roughness: 1 }),
  );
  trunk.position.y = 3.5;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 1 });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.4, 7.2, Math.sin(a) * 1.4);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  return group;
}

function makeLamp(x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.6, metalness: 0.4 }),
  );
  pole.position.y = 2.7;
  group.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc861, emissiveIntensity: 1.6 }),
  );
  head.position.y = 5.5;
  group.add(head);
  const light = new THREE.PointLight(0xffc861, 6, 14);
  light.position.y = 5.4;
  group.add(light);
  group.position.set(x, 0, z);
  return group;
}

function neonSign(text, color, width) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#12081f';
  g.fillRect(0, 0, 256, 64);
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: false }),
  );
  return mesh;
}

// A point is on a road when it is close to any road centre line.
export function isOnRoad(x, z) {
  const half = WORLD.roadWidth / 2 + 1;
  return ROAD_LINES.some((line) => Math.abs(x - line) < half || Math.abs(z - line) < half);
}

export function createWorld(scene, random) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  // Sunset sky, warm fog and a low sun — v2: much brighter overall so the
  // streets and facades read instead of going muddy brown.
  scene.background = new THREE.Color(WORLD.skyColor);
  scene.fog = new THREE.Fog(WORLD.fogColor, 140, 480);
  const sun = new THREE.DirectionalLight(0xffc07a, 3.4);
  sun.position.set(...WORLD.sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -240;
  sun.shadow.camera.right = 240;
  sun.shadow.camera.top = 240;
  sun.shadow.camera.bottom = -240;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x6a7a9b, 1.8));
  scene.add(new THREE.AmbientLight(0xffe2b8, 0.55));

  // Ground: pale sand-coloured base, lighter asphalt road strips on top.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfSize * 2 + 120, WORLD.halfSize * 2 + 120),
    new THREE.MeshStandardMaterial({ color: 0xd9b078, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x424a55, roughness: 0.95 });
  // Pale sidewalk strips flanking every road so streets read at a glance.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xcbb58a, roughness: 1 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  for (const line of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.halfSize * 2, WORLD.roadWidth), roadMat);
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = horizontal ? 0 : Math.PI / 2;
      strip.position.set(horizontal ? 0 : line, 0.02, horizontal ? line : 0);
      strip.receiveShadow = true;
      group.add(strip);
      // Sidewalk strips on both edges of the road.
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.halfSize * 2, 3), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.rotation.z = horizontal ? 0 : Math.PI / 2;
        walk.position.set(
          horizontal ? 0 : line + side * (WORLD.roadWidth / 2 + 1.5),
          0.015,
          horizontal ? line + side * (WORLD.roadWidth / 2 + 1.5) : 0,
        );
        walk.receiveShadow = true;
        group.add(walk);
      }
      // Dashed centre line.
      for (let t = -WORLD.halfSize; t < WORLD.halfSize; t += 12) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.35), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = horizontal ? 0 : Math.PI / 2;
        dash.position.set(horizontal ? t : line, 0.04, horizontal ? line : t);
        group.add(dash);
      }
    }
  }

  // Sea to the south-west, beyond the city edge, with the harbour pier
  // reaching into it. Kept clear of the road grid so streets stay dry.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x2a7fa8, roughness: 0.2, metalness: 0.35 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-300, 0.01, 300);
  group.add(sea);
  // Pier 9: low wooden deck running south into the sea at x=-210, with
  // plank slats, mooring posts, lamps and a boat tied up alongside.
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.3, 100),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }),
  );
  pierDeck.position.set(-210, 0.15, 200);
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  group.add(pierDeck);
  const plankMatA = new THREE.MeshStandardMaterial({ color: 0x9c7748, roughness: 1 });
  const plankMatB = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
  for (let pz = 154; pz <= 246; pz += 4) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.08, 2.2), (pz / 4) % 2 === 0 ? plankMatA : plankMatB);
    plank.position.set(-210, 0.34, pz);
    group.add(plank);
  }
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5d4126, roughness: 1 });
  for (let pz = 156; pz <= 248; pz += 11.5) {
    for (const px of [-215.5, -204.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.6, 6), postMat);
      post.position.set(px, 1.3, pz);
      post.castShadow = true;
      group.add(post);
    }
  }
  // Pier lamps: warm globes down both sides of the deck.
  for (let pz = 162; pz <= 242; pz += 20) {
    for (const px of [-214.5, -205.5]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.6, metalness: 0.4 }),
      );
      pole.position.set(px, 1.7, pz);
      group.add(pole);
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc861, emissiveIntensity: 1.8 }),
      );
      globe.position.set(px, 3.5, pz);
      group.add(globe);
    }
  }
  // A fishing boat moored beside the pier, hull + cabin + mast.
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.6, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 }),
  );
  hull.position.y = 0.8;
  boat.add(hull);
  const hullStripe = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.5, 16.2),
    new THREE.MeshStandardMaterial({ color: 0xd7263d, roughness: 0.6 }),
  );
  hullStripe.position.y = 0.5;
  boat.add(hullStripe);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 5),
    new THREE.MeshStandardMaterial({ color: 0x2e86c1, roughness: 0.6 }),
  );
  cabin.position.set(0, 2.4, -2);
  boat.add(cabin);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6b46, roughness: 1 }),
  );
  mast.position.set(0, 5.5, 2);
  boat.add(mast);
  boat.position.set(-228, 0, 232);
  boat.rotation.y = 0.25;
  group.add(boat);
  // Shipping containers stacked by the harbour gate.
  const containerColors = [0xd7263d, 0x2e86c1, 0xf39c12, 0x27ae60, 0x8e44ad];
  const containerSpots = [
    [-178, 252, 0], [-178, 260, 0], [-168, 252, 0], [-178, 252, 1], [-188, 264, 0],
  ];
  for (let i = 0; i < containerSpots.length; i += 1) {
    const [cx, cz, level] = containerSpots[i];
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2.6, 3),
      new THREE.MeshStandardMaterial({ color: containerColors[i % containerColors.length], roughness: 0.7, metalness: 0.3 }),
    );
    cont.position.set(cx, 1.3 + level * 2.6, cz);
    cont.castShadow = true;
    group.add(cont);
  }

  // Buildings fill every block BETWEEN the roads (block centres sit
  // halfway between road lines, never on them).
  // Six facade palettes so blocks stop reading as one flat brown wall.
  const textures = [
    windowTexture(random, '#e8b48a', '#ffd98a'),
    windowTexture(random, '#d98a7a', '#ffe9a8'),
    windowTexture(random, '#8fb3c9', '#fff2b0'),
    windowTexture(random, '#c9a86a', '#ffd27a'),
    windowTexture(random, '#7fb069', '#fff2b0'),
    windowTexture(random, '#b089c9', '#ffd98a'),
  ];
  const roofColors = [0xffd27a, 0xff9d7a, 0x7ad0ff, 0xffd23f, 0x9dff8a];
  const plaza = { minX: 80, maxX: 140, minZ: 80, maxZ: 140 };
  for (let bx = 0; bx < 8; bx += 1) {
    for (let bz = 0; bz < 8; bz += 1) {
      const cx = -132 + bx * WORLD.blockSize;
      const cz = -132 + bz * WORLD.blockSize;
      if (cx > plaza.minX && cx < plaza.maxX && cz > plaza.minZ && cz < plaza.maxZ) continue;
      if (cx < -150 && cz > 150) continue; // harbour corner stays open
      const downtown = Math.abs(cx) < 70 && Math.abs(cz) < 70;
      const h = downtown ? range(random, 28, 64) : range(random, 8, 22);
      const w = range(random, 20, 30);
      const d = range(random, 20, 30);
      const b = makeBuilding(random, cx + range(random, -3, 3), cz + range(random, -3, 3), w, d, h, pick(random, textures), pick(random, roofColors));
      group.add(b.mesh);
      group.add(b.rim);
      group.add(b.plant);
      colliders.push(b.box);
    }
  }

  // Night market plaza: stalls + neon signs.
  const stallColors = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf39c12, 0x9b59b6];
  for (let i = 0; i < 8; i += 1) {
    const stall = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.4, 4),
      new THREE.MeshStandardMaterial({ color: stallColors[i % stallColors.length], roughness: 0.8 }),
    );
    box.position.y = 1.2;
    stall.add(box);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.2, 1.8, 4),
      new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.7 }),
    );
    roof.position.y = 3.3;
    roof.rotation.y = Math.PI / 4;
    stall.add(roof);
    stall.position.set(96 + (i % 4) * 10, 0, 96 + Math.floor(i / 4) * 12);
    group.add(stall);
  }
  const signs = [
    ['SOLANO EATS', '#ff5fa2', 96, 122, 0],
    ['NEON MARKET', '#39d0ff', 122, 96, Math.PI / 2],
    ['PIER 9', '#ffd23f', -210, 148, 0],
  ];
  for (const [text, color, x, z, rot] of signs) {
    const sign = neonSign(text, color, 16);
    sign.position.set(x, 9, z);
    sign.rotation.y = rot;
    group.add(sign);
  }

  // Palms along the boardwalk, lamps at intersections.
  for (let t = -180; t <= 180; t += 22) {
    group.add(makePalm(t, 186));
    group.add(makePalm(186, t));
  }
  for (const lx of ROAD_LINES) {
    for (const lz of ROAD_LINES) {
      if ((lx + lz) % 88 === 0) group.add(makeLamp(lx + 8, lz + 8));
    }
  }

  // Push a circle out of every building box. Returns the corrected position.
  function resolveCollision(pos, radius) {
    for (const box of colliders) {
      const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          pos.x = box.maxX + radius;
        }
      }
    }
    pos.x = Math.max(-WORLD.halfSize, Math.min(WORLD.halfSize, pos.x));
    pos.z = Math.max(-WORLD.halfSize, Math.min(WORLD.halfSize, pos.z));
    return pos;
  }

  return { group, colliders, resolveCollision };
}
