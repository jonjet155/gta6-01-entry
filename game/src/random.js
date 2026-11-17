// Seeded randomness: one small generator (mulberry32) so a ?seed=N run of the city,
// the traffic and the screenshots is always the same city.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max] (inclusive). */
export function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of `items`. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Fisher-Yates shuffle, in place, on a copy. */
export function shuffled(rng, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
