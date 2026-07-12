import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildRegistry, matchPlayer, normalizeName, resolveByExternalId,
  buildMatchReport, resolveDefenseTeam, isDefense,
} from '../src/engine/identity.js';

const players = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/sleeper_players_sample.json'), 'utf8'));
const reg = buildRegistry(players);

test('normalizeName handles suffixes, apostrophes, accents, hyphens', () => {
  assert.equal(normalizeName('Kenneth Walker III').base, 'kenneth walker');
  assert.equal(normalizeName('Kenneth Walker III').hadSuffix, true);
  assert.equal(normalizeName("D'Andre Swift").compact, 'dandreswift');
  assert.equal(normalizeName('Amon-Ra St. Brown').compact, 'amonrastbrown');
  assert.equal(normalizeName('Marvin Harrison Jr.').base, 'marvin harrison');
});

test('GV7 — Amon-Ra St. Brown resolves', () => {
  const r = matchPlayer(reg, { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET' });
  assert.equal(r.matched, true);
  assert.equal(r.playerId, '6801');
});

test('GV7 — Kenneth Walker III resolves (suffix-insensitive)', () => {
  const r = matchPlayer(reg, { name: 'Kenneth Walker III', position: 'RB' });
  assert.equal(r.matched, true);
  assert.equal(r.playerId, '8151');
});

test("GV7 — D'Andre Swift resolves", () => {
  const r = matchPlayer(reg, { name: "D'Andre Swift" });
  assert.equal(r.matched, true);
  assert.equal(r.playerId, '6813');
});

test('GV7 — team defense entity resolution', () => {
  assert.equal(resolveDefenseTeam({ name: '49ers D/ST' }), 'SF');
  assert.equal(resolveDefenseTeam({ name: 'San Francisco 49ers' }), 'SF');
  assert.equal(resolveDefenseTeam({ name: 'SF' }), 'SF');
  assert.equal(isDefense({ name: '49ers D/ST' }), true);

  const r1 = matchPlayer(reg, { name: '49ers D/ST' });
  assert.equal(r1.matched, true);
  assert.equal(r1.playerId, 'SF');
  assert.equal(r1.method, 'team-defense');

  const r2 = matchPlayer(reg, { name: 'San Francisco 49ers', position: 'DEF' });
  assert.equal(r2.playerId, 'SF');
});

test('GV7 — constructed ambiguity flags instead of guessing', () => {
  // Two "Josh Allen"s (QB BUF, DE JAX) in the corpus.
  const amb = matchPlayer(reg, { name: 'Josh Allen' });
  assert.equal(amb.matched, false);
  assert.equal(amb.method, 'ambiguous');
  assert.equal(amb.candidates.length, 2);

  // Disambiguate by position.
  const qb = matchPlayer(reg, { name: 'Josh Allen', position: 'QB' });
  assert.equal(qb.matched, true);
  assert.equal(qb.playerId, '6786');

  // Two "Michael Thomas"es also disambiguate by position/team.
  const mtAmb = matchPlayer(reg, { name: 'Michael Thomas' });
  assert.equal(mtAmb.matched, false);
  const mtWr = matchPlayer(reg, { name: 'Michael Thomas', position: 'WR', team: 'NO' });
  assert.equal(mtWr.matched, true);
  assert.equal(mtWr.playerId, '1466');
});

test('cross-platform ID crosswalk resolves', () => {
  assert.equal(resolveByExternalId(reg, 'espn', 3117251), '4034');   // McCaffrey ESPN id
  assert.equal(resolveByExternalId(reg, 'yahoo', 32692), '6794');    // Jefferson Yahoo id
  assert.equal(resolveByExternalId(reg, 'gsis', '00-0033873'), '4046'); // Mahomes GSIS id
  assert.equal(resolveByExternalId(reg, 'espn', 99999999), null);
});

test('build match report surfaces unmatched + ambiguous, never drops', () => {
  const rows = [
    { name: 'Justin Jefferson', position: 'WR', team: 'MIN' },
    { name: 'Josh Allen' },                                  // ambiguous
    { name: 'Nonexistent Player', position: 'RB', team: 'KC' }, // unmatched
    { name: '49ers D/ST' },                                  // defense
  ];
  const report = buildMatchReport(reg, rows);
  assert.equal(report.stats.total, 4);
  assert.equal(report.stats.matched, 2);      // Jefferson + SF DST
  assert.equal(report.stats.ambiguous, 1);    // Josh Allen
  assert.equal(report.stats.unmatched, 1);    // Nonexistent
  assert.equal(report.matched.length + report.ambiguous.length + report.unmatched.length, 4);
});
