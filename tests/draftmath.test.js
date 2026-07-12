import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSnakePicks, pickNumber, getSnakeBoard,
  splitAuctionBudget, keeperCost,
} from '../src/engine/draftmath.js';

test('GV1 — snake 12 teams, slot 7, 8 rounds', () => {
  assert.deepEqual(
    getSnakePicks({ teams: 12, slot: 7, rounds: 8 }),
    [7, 18, 31, 42, 55, 66, 79, 90],
  );
});

test('GV2 — snake 10 teams, slot 1 turn behavior', () => {
  assert.deepEqual(
    getSnakePicks({ teams: 10, slot: 1, rounds: 5 }),
    [1, 20, 21, 40, 41],
  );
});

test('GV3 — third-round reversal: 12 teams, slot 7, R3 = 30 (standard = 31)', () => {
  assert.equal(pickNumber(12, 7, 3, 'snake'), 31);
  assert.equal(pickNumber(12, 7, 3, '3rr'), 30);
  // 3RR direction sequence sanity: R1 fwd, R2 rev, R3 rev, R4 fwd.
  assert.deepEqual(
    getSnakePicks({ teams: 12, slot: 7, rounds: 4, variant: '3rr' }),
    [7, 18, 30, 43],
  );
});

test('snake board: every overall pick 1..teams*rounds appears exactly once', () => {
  const { board } = getSnakeBoard({ teams: 12, rounds: 15 });
  const seen = new Set();
  for (const row of board) for (const cell of row) {
    assert.ok(!seen.has(cell.overall), 'duplicate overall ' + cell.overall);
    seen.add(cell.overall);
  }
  assert.equal(seen.size, 12 * 15);
});

test('snake board round 2 reverses slot ownership', () => {
  const { board } = getSnakeBoard({ teams: 10, rounds: 2 });
  // Round 2, first pick overall = 11, owned by slot 10.
  assert.equal(board[1][0].overall, 11);
  assert.equal(board[1][0].slot, 10);
});

test('auction split hits the exact budget and honors the $1 floor', () => {
  const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH', 'BENCH'];
  for (const preset of ['balanced', 'stars-and-scrubs', 'robust-rb', 'hero-rb', 'even']) {
    const res = splitAuctionBudget({ budget: 200, slots, preset });
    assert.equal(res.total, 200, `${preset} should total budget`);
    for (const a of res.allocations) assert.ok(a.amount >= 1, `${preset} slot below $1`);
  }
});

test('auction split rejects impossible budgets', () => {
  assert.throws(() => splitAuctionBudget({ budget: 5, slots: new Array(16).fill('BENCH') }));
});

test('stars-and-scrubs concentrates more on RB than even split', () => {
  const slots = ['RB', 'RB', 'WR', 'WR', 'BENCH', 'BENCH'];
  const ss = splitAuctionBudget({ budget: 200, slots, preset: 'stars-and-scrubs' });
  const rbSpend = ss.allocations.filter((a) => a.slot === 'RB').reduce((s, a) => s + a.amount, 0);
  assert.ok(rbSpend > 200 * (2 / 6), 'RB should get more than an even share');
});

test('keeper cost rules', () => {
  assert.equal(keeperCost({ rule: 'round-minus', roundDrafted: 10 }).costRound, 9);
  assert.equal(keeperCost({ rule: 'escalate', roundDrafted: 10, yearsKept: 2 }).costRound, 7);
  assert.equal(keeperCost({ rule: 'one-round-earlier', roundDrafted: 5 }).costRound, 4);
  assert.equal(keeperCost({ rule: 'flat', roundDrafted: 8 }).costRound, 8);
  // Floors at round 1.
  assert.equal(keeperCost({ rule: 'round-minus', roundDrafted: 1 }).costRound, 1);
});
