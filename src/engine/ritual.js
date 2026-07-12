/**
 * ritual.js — THE FLAGSHIP: provably-fair draft-order reveal.
 *
 * Commit-reveal protocol, in plain language:
 *   1. We generate a cryptographically-random `seed` (crypto.getRandomValues).
 *   2. We publish `commitment = SHA-256(seed)` BEFORE the reveal — the
 *      commissioner shares this hash in the group chat so they are locked in
 *      and cannot re-roll after seeing reactions.
 *   3. We run the reveal (theatrically, in the UI). The draft order is a
 *      deterministic function of the seed + the exact run material (league,
 *      teams, mode, weights).
 *   4. We expose the `seed`. Anyone can recompute SHA-256(seed) to check it
 *      matches the commitment, and re-derive the order — on our /verify/ page
 *      or by hand. The share permalink carries everything needed.
 *
 * Honesty note we surface on-page: commit-reveal proves the order was fixed
 * before the reveal and was produced by this exact algorithm from this exact
 * seed. It does not (and cannot, without a public randomness beacon) prove the
 * commissioner didn't grind seeds before committing — so we generate the seed
 * with a CSPRNG and commit immediately. We document this limitation rather than
 * overclaim. Market data + fair tools, no hot takes.
 *
 * Determinism: order derivation is seeded-PRNG -> Fisher-Yates (uniform modes)
 * or seeded weighted selection (lottery mode), using only 32-bit integer math,
 * so it is byte-identical across browsers and Node. Golden-tested.
 *
 * No accounts, no server storage: the permalink IS the record.
 *
 * Pure ES module. `crypto` (Web Crypto) is the only ambient dependency and is
 * present in browsers and Node >= 20.
 */

import { generateSeed, sha256Hex, hexEqual } from './util/hash.js';
import { makeRng, fisherYates, weightedDrawOrder } from './util/rng.js';
import { b64urlEncode, b64urlDecode } from './util/base64.js';
import { buildIcs } from './util/ics.js';

export const RITUAL_VERSION = 1;
export const MODES = Object.freeze(['instant', 'suspense', 'weighted']);

// ---------------------------------------------------------------------------
// Run material (what the order is bound to) and derivation
// ---------------------------------------------------------------------------

/**
 * The derivation class that actually governs the draw. `instant` and `suspense`
 * are the SAME uniform draw — they differ only in how the UI reveals it — so
 * they must produce an identical order for a given seed. `weighted` is a
 * genuinely different draw. Binding to the class (not the raw mode) means
 * flipping instant<->suspense never changes the order, while flipping to/from
 * weighted correctly does.
 */
export function derivationClass(mode) {
  return mode === 'weighted' ? 'weighted' : 'uniform';
}

/**
 * Canonical, stable serialization of everything the order depends on. Any change
 * to teams, derivation class, or weights changes this string and therefore the
 * derived order, so verification detects tampering with any of them.
 */
export function runMaterial({ seed, teamNames, mode, weights }) {
  const klass = derivationClass(mode);
  const parts = [
    'dukefantasy-ritual',
    'v' + RITUAL_VERSION,
    'class=' + klass,
    'seed=' + seed,
    'teams=' + teamNames.map((t) => String(t)).join('␟'), // unit separator, unlikely in names
  ];
  if (klass === 'weighted') {
    parts.push('weights=' + (weights || []).map((w) => String(Number(w) || 0)).join(','));
  }
  return parts.join(''); // record separator
}

/**
 * Derive the draft order (array of 0-based input indices, pick 1 first) from the
 * seed and run material. Pure and deterministic.
 */
export function deriveOrderIndices({ seed, teamNames, mode, weights }) {
  const n = teamNames.length;
  const rng = makeRng(runMaterial({ seed, teamNames, mode, weights }));
  if (mode === 'weighted') {
    const w = normalizeWeights(weights, n);
    return weightedDrawOrder(w, rng);
  }
  // instant + suspense share the same uniform derivation; suspense differs only
  // in presentation (revealed one at a time).
  return fisherYates(n, rng);
}

function normalizeWeights(weights, n) {
  if (!Array.isArray(weights) || weights.length !== n) {
    // No/invalid weights -> uniform.
    return Array.from({ length: n }, () => 1);
  }
  return weights.map((x) => Math.max(0, Number(x) || 0));
}

// ---------------------------------------------------------------------------
// Weighted-lottery odds (exact) + standings -> weights presets
// ---------------------------------------------------------------------------

/**
 * NBA-lottery-style weight presets from a standings order.
 * @param {string[]} standingsWorstFirst  team names ordered worst record -> best
 *        (worst gets the best odds), length n.
 * @param {'linear'|'steep'|'flat'} [preset='linear']
 * @returns {number[]} weights aligned to `standingsWorstFirst`
 */
export function weightsFromStandings(standingsWorstFirst, preset = 'linear') {
  const n = standingsWorstFirst.length;
  if (preset === 'flat') return standingsWorstFirst.map(() => 1);
  if (preset === 'steep') {
    // Heavier tilt toward the worst teams (weight ~ (rank)^2 from the top).
    return standingsWorstFirst.map((_, i) => (n - i) * (n - i));
  }
  // linear: worst team weight n, next n-1, ... best team weight 1.
  return standingsWorstFirst.map((_, i) => n - i);
}

/**
 * Exact odds table for the sequential weighted draw implemented in
 * weightedDrawOrder(). Returns:
 *   - firstPick[i]      = P(team i receives pick #1) = w_i / sum(w)   (exact)
 *   - slotMatrix[i][j]  = P(team i receives slot j)  (exact for n <= 16)
 *   - rowSums / colSums both == 1 (within fp error)
 * For n > 16 (never happens in real leagues) slotMatrix is null and only the
 * exact firstPick column is returned, with `exact:false`.
 */
export function computeLotteryOdds(weights) {
  const w = weights.map((x) => Math.max(0, Number(x) || 0));
  const n = w.length;
  const W = w.reduce((s, x) => s + x, 0) || 1;
  const firstPick = w.map((x) => x / W);

  if (n === 0) return { n, firstPick: [], slotMatrix: [], exact: true };
  if (n > 16) return { n, firstPick, slotMatrix: null, exact: false };

  const size = 1 << n;
  const full = size - 1;
  const prob = new Float64Array(size);
  prob[full] = 1;
  const slot = Array.from({ length: n }, () => new Float64Array(n));

  // Iterate masks in descending numeric order: every predecessor (mask | bit)
  // is numerically larger, so it is fully accumulated before we process `mask`.
  for (let mask = full; mask > 0; mask--) {
    const p = prob[mask];
    if (p === 0) continue;
    const picksMade = n - popcount(mask); // slot index being filled now
    let remW = 0;
    for (let t = 0; t < n; t++) if (mask & (1 << t)) remW += w[t];
    if (remW <= 0) {
      // Uniform among remaining (degenerate all-zero-weight tail).
      const cnt = popcount(mask);
      for (let t = 0; t < n; t++) {
        if (!(mask & (1 << t))) continue;
        const pt = p / cnt;
        slot[t][picksMade] += pt;
        prob[mask & ~(1 << t)] += pt;
      }
    } else {
      for (let t = 0; t < n; t++) {
        if (!(mask & (1 << t))) continue;
        const pt = p * (w[t] / remW);
        slot[t][picksMade] += pt;
        prob[mask & ~(1 << t)] += pt;
      }
    }
  }

  const slotMatrix = slot.map((row) => Array.from(row));
  return { n, firstPick, slotMatrix, exact: true };
}

function popcount(x) {
  let c = 0;
  while (x) { x &= x - 1; c++; }
  return c;
}

// ---------------------------------------------------------------------------
// Permalink codec (the viral artifact)
// ---------------------------------------------------------------------------

/** Compact share payload: everything needed to reproduce & verify the run. */
export function encodePermalink(run) {
  const payload = {
    v: RITUAL_VERSION,
    l: run.leagueName || '',
    t: run.teamNames,
    m: run.mode,
    s: run.seed,
  };
  if (run.mode === 'weighted') payload.w = run.weights || null;
  return b64urlEncode(JSON.stringify(payload));
}

/** Decode a permalink payload back into a partial run config. Throws if invalid. */
export function decodePermalink(code) {
  const obj = JSON.parse(b64urlDecode(code));
  if (!obj || typeof obj !== 'object') throw new Error('permalink: not an object');
  if (obj.v !== RITUAL_VERSION) throw new Error('permalink: unsupported version ' + obj.v);
  if (!Array.isArray(obj.t) || obj.t.length < 2) throw new Error('permalink: missing teams');
  if (!MODES.includes(obj.m)) throw new Error('permalink: bad mode ' + obj.m);
  if (typeof obj.s !== 'string' || !obj.s) throw new Error('permalink: missing seed');
  return {
    leagueName: obj.l || '',
    teamNames: obj.t.map(String),
    mode: obj.m,
    seed: obj.s,
    weights: obj.m === 'weighted' ? (obj.w || null) : null,
  };
}

// ---------------------------------------------------------------------------
// Public API: run + verify
// ---------------------------------------------------------------------------

function validateConfig(config) {
  if (!config || !Array.isArray(config.teamNames)) throw new Error('ritual: teamNames[] is required');
  const teamNames = config.teamNames.map((t) => String(t).trim()).filter((t) => t.length > 0);
  if (teamNames.length < 2) throw new Error('ritual: need at least 2 teams');
  if (teamNames.length > 32) throw new Error('ritual: max 32 teams');
  const mode = config.mode || 'instant';
  if (!MODES.includes(mode)) throw new Error('ritual: unknown mode ' + mode);
  return { teamNames, mode };
}

/**
 * Run (or reproduce) a draft-order reveal.
 *
 * @param {object} config
 * @param {string[]} config.teamNames
 * @param {string} [config.leagueName]
 * @param {'instant'|'suspense'|'weighted'} [config.mode='instant']
 * @param {string} [config.seed]        supply to reproduce; omit to generate
 * @param {number[]} [config.weights]   weighted mode (aligned to teamNames)
 * @param {string[]} [config.standingsWorstFirst]  alt to weights (see preset)
 * @param {'linear'|'steep'|'flat'} [config.weightPreset='linear']
 * @param {'first-to-last'|'last-to-first'} [config.revealDirection='last-to-first']
 * @returns {Promise<object>} the full run record (see module docs)
 */
export async function runRitual(config) {
  const { teamNames, mode } = validateConfig(config);
  const seed = config.seed || generateSeed();

  let weights = null;
  let odds = null;
  if (mode === 'weighted') {
    if (Array.isArray(config.weights) && config.weights.length === teamNames.length) {
      weights = config.weights.map((x) => Math.max(0, Number(x) || 0));
    } else if (Array.isArray(config.standingsWorstFirst) && config.standingsWorstFirst.length === teamNames.length) {
      weights = weightsFromStandings(config.standingsWorstFirst, config.weightPreset || 'linear');
    } else {
      weights = teamNames.map(() => 1); // uniform fallback (documented)
    }
    odds = computeLotteryOdds(weights);
  }

  const orderIndices = deriveOrderIndices({ seed, teamNames, mode, weights });
  const order = orderIndices.map((i) => teamNames[i]);

  const commitment = await sha256Hex(seed);
  const runDigest = await sha256Hex(runMaterial({ seed, teamNames, mode, weights }));

  const revealDirection = config.revealDirection || 'last-to-first';
  const reveal = buildRevealSteps(order, revealDirection);

  const run = {
    version: RITUAL_VERSION,
    leagueName: config.leagueName || '',
    teamNames,
    mode,
    seed,
    commitment,
    runDigest,
    weights,
    odds,
    orderIndices,
    order,
    reveal,
    state: 'complete',
  };
  run.permalink = encodePermalink(run);
  return run;
}

/**
 * Build the reveal state layer (theatrics belong to v0). Each step carries its
 * TRUE pick number regardless of reveal direction.
 * State machine the UI implements: setup -> committed -> revealing[i] -> complete.
 */
export function buildRevealSteps(order, direction = 'last-to-first') {
  const steps = order.map((team, idx) => ({ pick: idx + 1, index: idx, team }));
  const sequence = direction === 'first-to-last' ? steps : steps.slice().reverse();
  return { direction, steps: sequence };
}

/**
 * Verify a run — from a full run object, a permalink string, or a config with
 * a `claimedOrder`/`commitment` to check against.
 *
 * Checks:
 *   - commitmentValid: SHA-256(seed) === commitment (detects a tampered seed)
 *   - orderValid:      re-derived order === claimed order (detects tampered
 *                      teams/mode/weights/order)
 *   - runDigestValid:  SHA-256(runMaterial) === runDigest, when provided
 *
 * @param {object|string} input  run object OR permalink code string
 * @param {object} [expected]    optional { commitment, order, runDigest } to
 *        check a decoded permalink against a separately-published commitment.
 * @returns {Promise<object>} verification result
 */
export async function verifyRitual(input, expected = {}) {
  let cfg;
  let claimed = {};
  if (typeof input === 'string') {
    cfg = decodePermalink(input);
  } else if (input && typeof input === 'object') {
    cfg = {
      leagueName: input.leagueName || '',
      teamNames: input.teamNames,
      mode: input.mode,
      seed: input.seed,
      weights: input.weights || null,
    };
    claimed = { commitment: input.commitment, order: input.order, runDigest: input.runDigest };
  } else {
    throw new Error('verifyRitual: pass a run object or a permalink string');
  }

  const commitmentToCheck = expected.commitment ?? claimed.commitment ?? null;
  const orderToCheck = expected.order ?? claimed.order ?? null;
  const runDigestToCheck = expected.runDigest ?? claimed.runDigest ?? null;

  const recomputedCommitment = await sha256Hex(cfg.seed);
  const recomputedDigest = await sha256Hex(runMaterial(cfg));
  const recomputedIndices = deriveOrderIndices(cfg);
  const recomputedOrder = recomputedIndices.map((i) => cfg.teamNames[i]);

  const commitmentValid = commitmentToCheck == null ? null : hexEqual(recomputedCommitment, commitmentToCheck);
  const runDigestValid = runDigestToCheck == null ? null : hexEqual(recomputedDigest, runDigestToCheck);
  const orderValid = orderToCheck == null
    ? null
    : Array.isArray(orderToCheck) &&
      orderToCheck.length === recomputedOrder.length &&
      orderToCheck.every((t, i) => String(t) === recomputedOrder[i]);

  const checks = [commitmentValid, orderValid, runDigestValid].filter((v) => v !== null);
  const valid = checks.length > 0 && checks.every(Boolean);

  return {
    valid,
    commitmentValid,
    orderValid,
    runDigestValid,
    recomputedCommitment,
    recomputedOrder,
    recomputedRunDigest: recomputedDigest,
    config: cfg,
    reasons: buildReasons({ commitmentValid, orderValid, runDigestValid }),
  };
}

function buildReasons({ commitmentValid, orderValid, runDigestValid }) {
  const reasons = [];
  if (commitmentValid === false) reasons.push('The seed does not match the published commitment (SHA-256 mismatch). The seed was changed after commitment.');
  if (orderValid === false) reasons.push('The re-derived order does not match the published order. Teams, mode, weights, or the order itself were changed.');
  if (runDigestValid === false) reasons.push('The run digest does not match. Some part of the run material was altered.');
  if (reasons.length === 0) reasons.push('All available checks passed: the seed matches its commitment and the order reproduces exactly.');
  return reasons;
}

// ---------------------------------------------------------------------------
// Draft-party .ics (reuses the shared calendar utility)
// ---------------------------------------------------------------------------

/**
 * Generate a "Draft Party" calendar invite for a run.
 * @param {object} run          a run record (for league/teams context)
 * @param {object} party        { start, end?, durationMinutes?, location?, url? }
 * @returns {string} an .ics string
 */
export function draftPartyIcs(run, party) {
  const league = run.leagueName ? run.leagueName : 'Our league';
  const teamLine = run.order && run.order.length
    ? `Draft order: ${run.order.map((t, i) => `${i + 1}. ${t}`).join(' • ')}`
    : '';
  return buildIcs({
    title: `${league} — Fantasy Draft`,
    start: party.start,
    end: party.end,
    durationMinutes: party.durationMinutes ?? 180,
    location: party.location || 'TBD',
    url: party.url,
    description: [
      'Draft party! Bring snacks and opinions.',
      teamLine,
      party.url ? `Order + fairness proof: ${party.url}` : '',
      'Made with DukeFantasy — market data + fair tools, no hot takes.',
    ].filter(Boolean).join('\n'),
    uid: party.uid || (run.commitment ? `ritual-${run.commitment.slice(0, 16)}@dukefantasy.com` : undefined),
    dtstamp: party.dtstamp,
  });
}
