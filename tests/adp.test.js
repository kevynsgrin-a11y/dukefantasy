import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseFfcAdp, computeConsensus, computeDeltas, clusterTiers, adpStamp,
} from '../src/engine/adp.js';

const load = (f) => JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/', f), 'utf8'));
const ppr = parseFfcAdp(load('ffc_adp_ppr_12_2026-07.json'), { fetchedAt: '2026-07-12' });
const half = parseFfcAdp(load('ffc_adp_half-ppr_12_2026-07.json'), { fetchedAt: '2026-07-12' });
const std = parseFfcAdp(load('ffc_adp_standard_12_2026-07.json'), { fetchedAt: '2026-07-12' });

test('parse labels format + teams as first-class', () => {
  assert.equal(ppr.format, 'ppr');
  assert.equal(ppr.formatLabel, 'Full PPR');
  assert.equal(ppr.teams, 12);
  assert.equal(ppr.attribution, 'ADP data by Fantasy Football Calculator');
  assert.ok(ppr.players.length >= 8);
});

test('GV8 — combining PPR and standard into one consensus THROWS', () => {
  assert.throws(() => computeConsensus([ppr, std]), /blend scoring formats/);
  // Same-format consensus is fine.
  const c = computeConsensus([ppr]);
  assert.equal(c.format, 'ppr');
  assert.ok(c.players.length >= 8);
});

test('GV8 — delta view labels BOTH formats and frames plainly', () => {
  const d = computeDeltas(ppr, std);
  assert.equal(d.formatA, 'ppr');
  assert.equal(d.formatB, 'standard');
  const swift = d.rows.find((r) => /Swift/.test(r.name));
  assert.ok(swift, 'Swift present in delta');
  // 66.2 (PPR) -> 72.5 (standard) = +6.3 later in standard.
  assert.ok(Math.abs(swift.delta - 6.3) < 0.001, 'delta ~6.3, got ' + swift.delta);
  assert.match(swift.framing, /later in Standard/i);
});

test('half-ppr sits between ppr and standard for a pass-catching back', () => {
  const g = (s) => s.players.find((p) => /Swift/.test(p.name)).adp;
  assert.ok(g(ppr) < g(half) && g(half) < g(std), 'half-ppr between ppr and standard');
});

test('tier clustering is deterministic and gap-based', () => {
  const a = clusterTiers(ppr);
  const b = clusterTiers(ppr);
  assert.deepEqual(
    a.tiers.map((t) => t.players.map((p) => p.name)),
    b.tiers.map((t) => t.players.map((p) => p.name)),
    'deterministic across runs',
  );

  // Synthetic series with obvious gaps at 3->20 and 22->50.
  const synthetic = {
    format: 'ppr', formatLabel: 'Full PPR',
    players: [
      { name: 'A', position: 'RB', team: 'X', adp: 1 },
      { name: 'B', position: 'RB', team: 'X', adp: 2 },
      { name: 'C', position: 'RB', team: 'X', adp: 3 },
      { name: 'D', position: 'WR', team: 'Y', adp: 20 },
      { name: 'E', position: 'WR', team: 'Y', adp: 21 },
      { name: 'F', position: 'WR', team: 'Y', adp: 22 },
      { name: 'G', position: 'TE', team: 'Z', adp: 50 },
      { name: 'H', position: 'TE', team: 'Z', adp: 51 },
    ],
  };
  const t = clusterTiers(synthetic);
  assert.equal(t.tiers.length, 3);
  assert.deepEqual(t.tiers.map((x) => x.players.length), [3, 3, 2]);
});

test('adp staleness stamp reads "as of {date}, {n} drafts"', () => {
  const s = adpStamp(ppr, new Date('2026-07-13T00:00:00Z'));
  assert.match(s.text, /Full PPR ADP/);
  assert.match(s.text, /drafts/);
  assert.match(s.text, /Jul 12, 2026/);
});
