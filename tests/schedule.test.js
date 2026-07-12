import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSchedule, getByeWeeks, getByeGrid, checkByeConflicts,
  getSeasonKickoff, daysBetween, getCountdown, kickoffDatetime,
  easternOffsetHours, isUsEasternDst,
} from '../src/engine/schedule.js';

const raw = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/nflverse_schedule_2026.json'), 'utf8'));
const sched = parseSchedule(raw);

test('schedule parses 272 REG games across weeks 1-18', () => {
  assert.equal(sched.reg.length, 272);
  assert.equal(sched.teams.length, 32);
  assert.deepEqual([sched.weeks[0], sched.weeks[sched.weeks.length - 1]], [1, 18]);
});

test('GV9 — bye weeks match hand-checked teams', () => {
  const byes = getByeWeeks(sched);
  assert.equal(byes.KC, 5);
  assert.equal(byes.SF, 8);
  assert.equal(byes.PHI, 10);
  assert.equal(byes.BUF, 7);
  // Every team has exactly one bye.
  assert.ok(Object.values(byes).every((b) => typeof b === 'number'));
});

test('bye grid groups teams by week', () => {
  const grid = getByeGrid(sched);
  assert.ok(grid[5].includes('KC'));
  assert.ok(grid[8].includes('SF'));
});

test('GV9 — countdown arithmetic: 2026-07-12 -> 2026-09-10 = 60 days', () => {
  assert.equal(daysBetween('2026-07-12', '2026-09-10'), 60);
  // Data-derived first kickoff is one day earlier (Wed Sep 9).
  assert.equal(daysBetween('2026-07-12', '2026-09-09'), 59);
});

test('GV9 — season kickoff is data-derived (Wed Sep 9, 2026), not assumed Sep 10', () => {
  const k = getSeasonKickoff(sched);
  assert.equal(k.gameday, '2026-09-09');
  assert.equal(k.weekday, 'Wednesday');
  // ET 20:20 in September (EDT, -4) => 00:20 UTC next day.
  assert.equal(k.kickoffUtc.toISOString(), '2026-09-10T00:20:00.000Z');
});

test('eastern offset is DST-aware', () => {
  assert.equal(isUsEasternDst(2026, 9, 13), true);
  assert.equal(easternOffsetHours(2026, 9, 13), 4);   // September = EDT
  assert.equal(easternOffsetHours(2026, 12, 1), 5);   // December = EST
  // A 1pm ET Sunday game in September -> 17:00 UTC.
  const g = sched.reg.find((x) => x.week === 1 && x.gametime === '13:00');
  assert.equal(kickoffDatetime(g).toISOString().slice(11, 16), '17:00');
});

test('countdown breakdown from now to kickoff', () => {
  const k = getSeasonKickoff(sched);
  // The precise UTC instant is Sep 10 00:20 UTC (Wed Sep 9 20:20 ET), so the
  // literal countdown from Jul 12 00:00 UTC = 60 days + 20 min. This matches the
  // mission's stated golden (-> Sep 10 = 60 days) exactly. The ET gameday is
  // Sep 9 (59 days) — both are correct in their own frame; we surface both.
  const cd = getCountdown(new Date('2026-07-12T00:00:00Z'), k.kickoffUtc);
  assert.equal(cd.past, false);
  assert.equal(cd.days, 60);
  assert.equal(cd.hours, 0);
  assert.equal(cd.minutes, 20);
  // The user-facing "days to gameday" uses the ET date = 59.
  assert.equal(daysBetween('2026-07-12', k.gameday), 59);
});

test('roster bye-conflict checker flags shared bye weeks', () => {
  // KC (bye 5) + another week-5 bye team should collide. Find one.
  const byes = getByeWeeks(sched);
  const wk5 = Object.keys(byes).filter((t) => byes[t] === 5);
  assert.ok(wk5.length >= 2, 'need >=2 teams on bye week 5 for the test');
  const roster = wk5.slice(0, 2).map((t) => ({ name: t + ' star', team: t }));
  const res = checkByeConflicts(sched, roster);
  assert.equal(res.conflicts[0].week, 5);
  assert.equal(res.conflicts[0].count, 2);
  assert.equal(res.worstWeek, 5);
});
