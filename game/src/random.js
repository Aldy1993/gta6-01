// Seeded PRNG: a screenshot seed must always build the same city.
// Mulberry32 — compact, fast, and identical on every browser.
export function createRandom(seed) {
  let state = seed >>> 0;

  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of a list at random.
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

// A float in [min, max).
export function range(random, min, max) {
  return min + random() * (max - min);
}
