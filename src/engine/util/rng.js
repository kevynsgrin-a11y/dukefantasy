/**
 * Deterministic, cross-browser-stable seeded PRNG utilities.
 *
 * These are the mathematical core of the flagship draft-order reveal: given the
 * same seed + run material, every browser (and Node) must derive byte-identical
 * results so anyone can independently re-verify a draft order. We therefore use
 * only 32-bit integer arithmetic (`Math.imul`, `>>> 0`) — no floats in the state,
 * no platform-dependent behavior.
 *
 * Algorithm: cyrb128 string hash -> 128-bit seed -> sfc32 PRNG. This is a
 * well-known, public-domain recipe for reproducible JS randomness.
 *
 * Pure module: zero DOM/Node coupling. Fixture/golden-tested.
 */

/** Hash an arbitrary string into four 32-bit unsigned integers (128-bit seed). */
export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * sfc32 PRNG. Takes a 128-bit seed (four uint32) and returns a function that
 * yields uniform floats in [0, 1). Deterministic and fast.
 */
export function sfc32(a, b, c, d) {
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
  return function next() {
    const t = (a + b | 0) + d | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Build a seeded random-float generator from any string material.
 * `next()` -> float in [0, 1).
 */
export function makeRng(material) {
  const [a, b, c, d] = cyrb128(String(material));
  return sfc32(a, b, c, d);
}

/**
 * Draw an integer in [0, n) from a seeded rng, without modulo bias for the
 * ranges a fantasy draft uses (n is tiny; float scaling is exact enough and
 * stable across engines). Deterministic.
 */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/**
 * Deterministic Fisher-Yates shuffle of indices [0..n-1] using a seeded rng.
 * Returns a permutation array. Does not mutate any input.
 *
 * This is the canonical uniform draw-order derivation. Iterating j from n-1
 * down to 1 and swapping with a uniformly chosen k in [0..j] is an unbiased
 * shuffle; pinned to the seeded rng it is fully reproducible.
 */
export function fisherYates(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let j = n - 1; j > 0; j--) {
    const k = randInt(rng, j + 1);
    const tmp = a[j];
    a[j] = a[k];
    a[k] = tmp;
  }
  return a;
}

/**
 * Deterministic weighted selection without replacement. `weights[i]` is the
 * relative weight of item i. Returns the order in which items are drawn (an
 * array of original indices, first-drawn first). Pinned to the seeded rng.
 *
 * Selection rule at each step: draw r in [0, sumRemainingWeight); walk the
 * cumulative weight of still-available items and pick the first item whose
 * cumulative weight exceeds r. This makes P(item i drawn first) = w_i / W
 * exactly — the property the odds table advertises.
 */
export function weightedDrawOrder(weights, rng) {
  const n = weights.length;
  const remaining = weights.map((w, i) => ({ i, w: Math.max(0, Number(w) || 0) }));
  const order = [];
  while (remaining.length > 0) {
    const total = remaining.reduce((s, x) => s + x.w, 0);
    let pickIdx;
    if (total <= 0) {
      // Degenerate: all remaining weights zero -> fall back to uniform among them.
      pickIdx = randInt(rng, remaining.length);
    } else {
      const r = rng() * total;
      let acc = 0;
      pickIdx = remaining.length - 1;
      for (let k = 0; k < remaining.length; k++) {
        acc += remaining[k].w;
        if (r < acc) { pickIdx = k; break; }
      }
    }
    order.push(remaining[pickIdx].i);
    remaining.splice(pickIdx, 1);
  }
  return order;
}
