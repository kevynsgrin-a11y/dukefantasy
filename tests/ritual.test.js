import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runRitual, verifyRitual, encodePermalink, decodePermalink,
  deriveOrderIndices, computeLotteryOdds, weightsFromStandings,
  draftPartyIcs, buildRevealSteps,
} from '../src/engine/ritual.js';
import { sha256Hex } from '../src/engine/util/hash.js';
import { makeRng, weightedDrawOrder } from '../src/engine/util/rng.js';

const TEAMS12 = [
  'Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta',
  'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel',
  'Team India', 'Team Juliet', 'Team Kilo', 'Team Lima',
];
const SEED = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('GV4 — determinism: fixed seed + 12 names run twice = identical order', async () => {
  const a = await runRitual({ leagueName: 'The League', teamNames: TEAMS12, mode: 'instant', seed: SEED });
  const b = await runRitual({ leagueName: 'The League', teamNames: TEAMS12, mode: 'instant', seed: SEED });
  assert.deepEqual(a.order, b.order);
  assert.equal(a.order.length, 12);
  // order is a permutation of the input.
  assert.deepEqual([...a.order].sort(), [...TEAMS12].sort());
});

test('GV4 — commitment equals SHA-256(seed)', async () => {
  const run = await runRitual({ teamNames: TEAMS12, mode: 'instant', seed: SEED });
  assert.equal(run.commitment, await sha256Hex(SEED));
});

test('GV4 — /verify/ reproduces the order from the permalink', async () => {
  const run = await runRitual({ teamNames: TEAMS12, mode: 'instant', seed: SEED });
  const res = await verifyRitual(run.permalink, { commitment: run.commitment, order: run.order });
  assert.equal(res.valid, true);
  assert.equal(res.commitmentValid, true);
  assert.equal(res.orderValid, true);
  assert.deepEqual(res.recomputedOrder, run.order);
});

test('GV5 — tampered seed fails verification loudly', async () => {
  const run = await runRitual({ teamNames: TEAMS12, mode: 'instant', seed: SEED });
  const decoded = decodePermalink(run.permalink);
  const tampered = { ...decoded, seed: 'deadbeefdeadbeefdeadbeefdeadbeef' };
  const res = await verifyRitual(tampered, { commitment: run.commitment, order: run.order });
  assert.equal(res.valid, false);
  assert.equal(res.commitmentValid, false);
  assert.equal(res.orderValid, false); // tampered seed also changes the order
  assert.ok(res.reasons.some((r) => /commitment/i.test(r)));
});

test('GV5 — tampered team name fails order verification', async () => {
  const run = await runRitual({ teamNames: TEAMS12, mode: 'instant', seed: SEED });
  const swapped = { ...decodePermalink(run.permalink) };
  swapped.teamNames = [...swapped.teamNames];
  swapped.teamNames[0] = 'Cheaters United';
  const res = await verifyRitual(swapped, { commitment: run.commitment, order: run.order });
  assert.equal(res.commitmentValid, true); // seed untouched
  assert.equal(res.orderValid, false);     // but the published order no longer reproduces
  assert.equal(res.valid, false);
});

test('permalink round-trips exactly', async () => {
  const run = await runRitual({ leagueName: 'Dynasty Warlords', teamNames: TEAMS12, mode: 'suspense', seed: SEED });
  const decoded = decodePermalink(encodePermalink(run));
  assert.equal(decoded.leagueName, 'Dynasty Warlords');
  assert.equal(decoded.mode, 'suspense');
  assert.equal(decoded.seed, SEED);
  assert.deepEqual(decoded.teamNames, TEAMS12);
});

test('suspense mode: same order as instant, only presentation differs', async () => {
  const inst = await runRitual({ teamNames: TEAMS12, mode: 'instant', seed: SEED });
  const susp = await runRitual({ teamNames: TEAMS12, mode: 'suspense', seed: SEED });
  // instant and suspense are the same uniform derivation family; suspense adds
  // reveal ordering but the underlying draft order is identical for a given seed.
  assert.deepEqual(inst.order, susp.order);
});

test('reveal steps carry true pick numbers regardless of direction', () => {
  const order = ['A', 'B', 'C'];
  const rev = buildRevealSteps(order, 'last-to-first');
  assert.deepEqual(rev.steps.map((s) => s.pick), [3, 2, 1]);
  assert.deepEqual(rev.steps.map((s) => s.team), ['C', 'B', 'A']);
  const fwd = buildRevealSteps(order, 'first-to-last');
  assert.deepEqual(fwd.steps.map((s) => s.pick), [1, 2, 3]);
});

test('GV6 — weighted lottery odds sum to 1 and match Monte-Carlo', () => {
  const weights = [12, 9, 7, 5, 4, 3]; // worst-to-best style
  const odds = computeLotteryOdds(weights);
  assert.equal(odds.exact, true);

  // First-pick probs sum to 1.
  const firstSum = odds.firstPick.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(firstSum - 1) < 1e-9, 'firstPick sums to 1');

  // Each team's slot-distribution row sums to 1; each slot column sums to 1.
  for (let i = 0; i < weights.length; i++) {
    const rowSum = odds.slotMatrix[i].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(rowSum - 1) < 1e-9, `row ${i} sums to 1`);
  }
  for (let j = 0; j < weights.length; j++) {
    let colSum = 0;
    for (let i = 0; i < weights.length; i++) colSum += odds.slotMatrix[i][j];
    assert.ok(Math.abs(colSum - 1) < 1e-9, `col ${j} sums to 1`);
  }

  // Monte-Carlo the actual seeded draw and compare the first-pick frequencies.
  const N = 20000;
  const counts = new Array(weights.length).fill(0);
  for (let k = 0; k < N; k++) {
    const rng = makeRng('mc-seed-' + k);
    const order = weightedDrawOrder(weights, rng);
    counts[order[0]] += 1;
  }
  for (let i = 0; i < weights.length; i++) {
    const empirical = counts[i] / N;
    assert.ok(Math.abs(empirical - odds.firstPick[i]) < 0.02, `team ${i}: MC ${empirical} vs exact ${odds.firstPick[i]}`);
  }
});

test('weighted mode produces a valid full permutation and reproduces on verify', async () => {
  const run = await runRitual({
    teamNames: TEAMS12,
    mode: 'weighted',
    seed: SEED,
    standingsWorstFirst: TEAMS12, // arbitrary but valid
    weightPreset: 'linear',
  });
  assert.equal(run.order.length, 12);
  assert.deepEqual([...run.order].sort(), [...TEAMS12].sort());
  assert.ok(run.odds && Math.abs(run.odds.firstPick.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  const res = await verifyRitual(run.permalink, { commitment: run.commitment, order: run.order });
  assert.equal(res.valid, true);
});

test('weightsFromStandings presets are ordered worst-best-descending', () => {
  const s = ['Worst', 'Mid', 'Best'];
  assert.deepEqual(weightsFromStandings(s, 'linear'), [3, 2, 1]);
  assert.deepEqual(weightsFromStandings(s, 'steep'), [9, 4, 1]);
  assert.deepEqual(weightsFromStandings(s, 'flat'), [1, 1, 1]);
});

test('draft-party .ics is well-formed and deterministic with fixed stamps', () => {
  const run = { leagueName: 'The League', order: ['A', 'B', 'C'], commitment: 'abc123def456' };
  const ics = draftPartyIcs(run, {
    start: '2026-08-29T23:00:00Z',
    durationMinutes: 180,
    location: 'Zoom',
    url: 'https://dukefantasy.com/verify/#x',
    uid: 'fixed-uid@dukefantasy.com',
    dtstamp: '2026-07-12T00:00:00Z',
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /DTSTART:20260829T230000Z/);
  assert.match(ics, /DTEND:20260830T020000Z/);
  assert.match(ics, /UID:fixed-uid@dukefantasy.com/);
  assert.match(ics, /END:VCALENDAR/);
  assert.match(ics, /\r\n/); // CRLF line endings
});

test('config guards: too few teams / bad mode throw', async () => {
  await assert.rejects(() => runRitual({ teamNames: ['solo'], mode: 'instant' }));
  await assert.rejects(() => runRitual({ teamNames: TEAMS12, mode: 'nonsense' }));
});
