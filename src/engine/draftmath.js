/**
 * draftmath.js — pure draft arithmetic. NO projections, NO opinions: this
 * module answers "when do I pick?" and "how should I split a budget?" with
 * deterministic math only. Golden-tested (GV1-GV3).
 */

export const SNAKE_VARIANTS = Object.freeze(['snake', '3rr', 'linear']);

/**
 * Is round `r` (1-based) drafted in reverse (highest slot picks first)?
 * - snake:  reverse on even rounds (F, R, F, R, ...)
 * - 3rr:    Third-Round Reversal — F, R, R, F, R, F, ... (round 3 repeats
 *           round 2's reverse; normal snaking resumes shifted afterward).
 *           This is the ESPN/Sleeper definition: the reversal that would flip
 *           into round 3 is delayed so the 1.01 owner does not lap the field.
 * - linear: never reverse (same order every round).
 */
export function isReverseRound(r, variant = 'snake') {
  if (variant === 'linear') return false;
  if (variant === '3rr') {
    if (r === 1) return false;
    if (r === 2) return true;
    return r % 2 === 1; // rounds >=3: reverse on odd rounds
  }
  return r % 2 === 0; // standard snake
}

/**
 * Overall pick number for a given slot in a given round.
 * @param {number} teams  league size
 * @param {number} slot   draft position, 1-based
 * @param {number} round  1-based
 * @param {string} [variant='snake']
 */
export function pickNumber(teams, slot, round, variant = 'snake') {
  assertInt(teams, 'teams', 2, 32);
  assertInt(slot, 'slot', 1, teams);
  assertInt(round, 'round', 1, 40);
  const base = (round - 1) * teams;
  return isReverseRound(round, variant) ? base + (teams - slot + 1) : base + slot;
}

/**
 * Full list of overall pick numbers for one draft slot across all rounds.
 * @returns {number[]} length `rounds`
 * Example (GV1): getSnakePicks({teams:12, slot:7, rounds:8})
 *   -> [7, 18, 31, 42, 55, 66, 79, 90]
 */
export function getSnakePicks({ teams, slot, rounds, variant = 'snake' }) {
  if (!SNAKE_VARIANTS.includes(variant)) throw new Error('draftmath: unknown variant ' + variant);
  const out = [];
  for (let r = 1; r <= rounds; r++) out.push(pickNumber(teams, slot, r, variant));
  return out;
}

/**
 * Full draft board grid. Returns rows by round; each cell has the overall pick,
 * the slot that owns it, and the pick-within-round. Feeds the SnakeBoard/PickGrid
 * components.
 */
export function getSnakeBoard({ teams, rounds, variant = 'snake' }) {
  assertInt(teams, 'teams', 2, 32);
  assertInt(rounds, 'rounds', 1, 40);
  const board = [];
  for (let r = 1; r <= rounds; r++) {
    const reverse = isReverseRound(r, variant);
    const row = [];
    for (let pickInRound = 1; pickInRound <= teams; pickInRound++) {
      const slot = reverse ? teams - pickInRound + 1 : pickInRound;
      row.push({ round: r, pickInRound, slot, overall: (r - 1) * teams + pickInRound, reverse });
    }
    board.push(row);
  }
  return { teams, rounds, variant, board };
}

// ---------------------------------------------------------------------------
// Auction budget splitter — a spending FRAMEWORK, not projections.
// ---------------------------------------------------------------------------

/**
 * Relative spend weights per roster slot for each preset. These are documented
 * budgeting heuristics (how much of your cap to earmark), not player values.
 */
export const AUCTION_PRESETS = Object.freeze({
  balanced: { RB: 1.0, WR: 1.0, QB: 0.5, TE: 0.5, FLEX: 0.7, DST: 0.1, K: 0.1, BENCH: 0.25 },
  'stars-and-scrubs': { RB: 1.6, WR: 1.5, QB: 0.35, TE: 0.35, FLEX: 0.5, DST: 0.05, K: 0.05, BENCH: 0.12 },
  'robust-rb': { RB: 1.7, WR: 0.9, QB: 0.4, TE: 0.4, FLEX: 0.6, DST: 0.1, K: 0.1, BENCH: 0.2 },
  'hero-rb': { RB: 1.2, WR: 1.3, QB: 0.45, TE: 0.5, FLEX: 0.6, DST: 0.1, K: 0.1, BENCH: 0.2 },
  even: {},
});

/**
 * Split an auction budget across roster slots.
 * @param {object} cfg
 * @param {number} cfg.budget         total cap (e.g. 200)
 * @param {string[]} cfg.slots        roster slots by position label, e.g.
 *                                     ['QB','RB','RB','WR','WR','TE','FLEX','DST','K', ...BENCH]
 * @param {string} [cfg.preset='balanced']
 * @param {number} [cfg.minPerSlot=1] every roster spot must cost at least $1.
 * @returns {{ preset:string, budget:number, allocations:Array<{slot:string,amount:number}>, total:number }}
 */
export function splitAuctionBudget({ budget, slots, preset = 'balanced', minPerSlot = 1 }) {
  assertInt(budget, 'budget', 1, 100000);
  if (!Array.isArray(slots) || slots.length === 0) throw new Error('draftmath: slots[] required');
  const table = AUCTION_PRESETS[preset];
  if (!table) throw new Error('draftmath: unknown auction preset ' + preset);
  const n = slots.length;
  if (budget < n * minPerSlot) throw new Error('draftmath: budget too small for roster size');

  const weights = slots.map((s) => {
    if (preset === 'even') return 1;
    const key = String(s).toUpperCase();
    return table[key] != null ? table[key] : (table.BENCH ?? 0.25);
  });
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;

  // Reserve the $1 minimum, distribute the remainder by weight, then round while
  // preserving the exact total.
  const pool = budget - n * minPerSlot;
  const raw = weights.map((w) => minPerSlot + (pool * w) / wSum);
  const amounts = largestRemainderRound(raw, budget);

  return {
    preset,
    budget,
    allocations: slots.map((slot, i) => ({ slot, amount: amounts[i] })),
    total: amounts.reduce((a, b) => a + b, 0),
  };
}

/** Round an array of floats to integers preserving the exact target sum. */
function largestRemainderRound(values, target) {
  const floors = values.map((v) => Math.floor(v));
  let remainder = target - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floors.slice();
  for (let k = 0; k < order.length && remainder > 0; k++) { out[order[k].i] += 1; remainder--; }
  return out;
}

// ---------------------------------------------------------------------------
// Keeper cost helper — configurable "round cost" rule presets.
// ---------------------------------------------------------------------------

export const KEEPER_RULES = Object.freeze(['round-minus', 'escalate', 'one-round-earlier', 'flat']);

/**
 * Compute the draft-round cost to keep a player under a configurable rule.
 * @param {object} cfg
 * @param {string} cfg.rule   one of KEEPER_RULES
 * @param {number} cfg.roundDrafted   the round the player was originally drafted
 *                                     (or acquired-value round for waiver adds)
 * @param {number} [cfg.yearsKept=0]   consecutive seasons already kept
 * @param {number} [cfg.penalty=1]     rounds subtracted per year for 'round-minus'/'escalate'
 * @param {number} [cfg.rounds=16]     total draft rounds (cap)
 * @returns {{ rule:string, costRound:number, note:string }}
 */
export function keeperCost({ rule, roundDrafted, yearsKept = 0, penalty = 1, rounds = 16 }) {
  if (!KEEPER_RULES.includes(rule)) throw new Error('draftmath: unknown keeper rule ' + rule);
  assertInt(roundDrafted, 'roundDrafted', 1, rounds);
  let cost;
  switch (rule) {
    case 'round-minus':       cost = roundDrafted - penalty; break;
    case 'escalate':          cost = roundDrafted - penalty * (yearsKept + 1); break;
    case 'one-round-earlier': cost = roundDrafted - 1; break;
    case 'flat':              cost = roundDrafted; break;
  }
  const costRound = Math.max(1, Math.min(rounds, cost));
  return {
    rule,
    costRound,
    note: costRound === 1 && cost < 1
      ? 'Cost floored at round 1 (a keeper can never cost better than the 1st round).'
      : `Keeping costs your round-${costRound} pick.`,
  };
}

// ---------------------------------------------------------------------------

function assertInt(v, name, min, max) {
  if (!Number.isInteger(v)) throw new Error(`draftmath: ${name} must be an integer (got ${v})`);
  if (v < min || v > max) throw new Error(`draftmath: ${name} must be ${min}..${max} (got ${v})`);
}
