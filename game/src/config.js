// Port Solano — every tuning number for the whole game, in one place.
// Speeds, distances and rewards live here so balancing never means
// hunting through the gameplay files.

// The city is a square grid of blocks; halfSize is its half-width in units.
// Golden-hour palette: warm sky, haze, low sun.
export const WORLD = {
  halfSize: 220,
  blockSize: 44,
  roadWidth: 12,
  skyColor: 0xffcf8f,
  fogColor: 0xf7b06a,
  sunPosition: [-140, 90, -180],
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.7,
  punchRange: 2.2,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 38,
  maxReverse: 10,
  steer: 1.9,
  drag: 0.6,
};

export const TRAFFIC = {
  count: 14,
  speed: 9,
  colors: [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c, 0xe67e22, 0x95a5a6, 0x2c3e50],
};

export const PEDESTRIANS = {
  count: 22,
  speed: 1.6,
};

export const POLICE = {
  maxCars: 4,
  chaseSpeed: 30,
  ramDamage: 0,
  // Seconds out of sight before one wanted star fades away.
  coolDownPerStar: 14,
};

export const MISSIONS = [
  {
    id: 'first-fare',
    title: 'Mission 1 — First Fare',
    briefing:
      'Rico Vega owes the Marina loan sharks $2,400. A fare is waiting at the boardwalk. Pick them up, then drive them to the night market.',
    pickup: { x: -66, z: 150 },
    dropoff: { x: 110, z: -66 },
    reward: 180,
  },
  {
    id: 'hot-wheels',
    title: 'Mission 2 — Hot Wheels',
    briefing:
      'The sharks want a Sunray GT from the downtown garage lot. Take it — the alarm will bring the Solano PD down on you. Lose them at the old garage.',
    steal: { x: 66, z: 22 },
    escape: { x: -154, z: -154 },
    reward: 450,
  },
  {
    id: 'the-drop',
    title: 'Mission 3 — The Drop',
    briefing:
      'One last job: a sealed package for the pier at the end of the boardwalk. The whole precinct is watching. Deliver it and Rico is free.',
    pickup: { x: -22, z: -110 },
    dropoff: { x: -210, z: 238 },
    reward: 900,
  },
];

export const SAVE_KEY = 'port-solano-save-v1';
export const START_MONEY = 40;
export const STEP = 1 / 60;
