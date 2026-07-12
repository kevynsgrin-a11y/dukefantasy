import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSeasonMode, getSeasonModeFromDate } from '../src/engine/seasonmode.js';

test('GV11 — week 0 (preseason) => draft mode', () => {
  const m = getSeasonMode({ season_type: 'pre', week: 0 }, { now: new Date('2026-08-20T00:00:00Z') });
  assert.equal(m.mode, 'draft');
});

test('GV11 — week 1 regular => in-season', () => {
  const m = getSeasonMode({ season_type: 'regular', week: 1 }, { now: new Date('2026-09-13T00:00:00Z') });
  assert.equal(m.mode, 'in-season');
});

test('GV11 — boundary: last preseason moment vs first regular week', () => {
  const draft = getSeasonMode({ season_type: 'pre', week: 0 }, { now: new Date('2026-09-08T00:00:00Z') });
  const inSeason = getSeasonMode({ season_type: 'regular', week: 1 }, { now: new Date('2026-09-10T00:00:00Z') });
  assert.equal(draft.mode, 'draft');
  assert.equal(inSeason.mode, 'in-season');
});

test('off-season in deep winter => offseason; summer off => draft ramp', () => {
  const jan = getSeasonMode({ season_type: 'off', week: 1 }, { now: new Date('2027-02-15T00:00:00Z') });
  assert.equal(jan.mode, 'offseason');
  const july = getSeasonMode({ season_type: 'off', week: 1 }, { now: new Date('2026-07-12T00:00:00Z') });
  assert.equal(july.mode, 'draft');
});

test('playoffs (post) => in-season', () => {
  const m = getSeasonMode({ season_type: 'post', week: 19 }, { now: new Date('2027-01-15T00:00:00Z') });
  assert.equal(m.mode, 'in-season');
});

test('date fallback when Sleeper state is unavailable', () => {
  const kickoff = new Date('2026-09-10T00:20:00Z');
  assert.equal(getSeasonModeFromDate(new Date('2026-07-12T00:00:00Z'), kickoff).mode, 'draft');
  assert.equal(getSeasonModeFromDate(new Date('2026-10-01T00:00:00Z'), kickoff).mode, 'in-season');
  assert.equal(getSeasonModeFromDate(new Date('2027-03-01T00:00:00Z'), kickoff).mode, 'offseason');
});
