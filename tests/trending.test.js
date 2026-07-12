import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRegistry } from '../src/engine/identity.js';
import { buildTrendingBoard } from '../src/engine/trending.js';

const players = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/sleeper_players_sample.json'), 'utf8'));
const trending = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/sleeper_trending_add_2026-07.json'), 'utf8'));
const reg = buildRegistry(players);

test('trending board joins through identity, sorts by count desc', () => {
  const board = buildTrendingBoard(trending.trending, reg, { direction: 'add', lookbackHours: 24, now: new Date('2026-07-12T00:00:00Z') });
  assert.equal(board.direction, 'add');
  assert.match(board.headline, /Most added in the last 24h/);
  // Highest count first: player 11584 (Marvin Harrison Jr., 48213).
  assert.match(board.rows[0].name, /Harrison/);
  assert.ok(board.rows[0].count >= board.rows[1].count);
  assert.match(board.attribution, /Sleeper/);
  assert.match(board.disclaimer, /not a start\/sit/i);
});

test('trending board filters by position and surfaces unresolved', () => {
  const rbOnly = buildTrendingBoard(trending.trending, reg, { direction: 'add', position: 'RB' });
  assert.ok(rbOnly.rows.every((r) => r.position === 'RB'));
  // Accepts the wrapped object form too.
  const wrapped = buildTrendingBoard(trending, reg, {});
  assert.ok(wrapped.rows.length >= 1);
});

test('unresolved player ids do not vanish', () => {
  const withGhost = [{ player_id: 'ZZZ_UNKNOWN', count: 999 }, ...trending.trending];
  const board = buildTrendingBoard(withGhost, reg, {});
  assert.equal(board.stats.unresolved, 1);
  assert.equal(board.unresolved[0].player_id, 'ZZZ_UNKNOWN');
});
