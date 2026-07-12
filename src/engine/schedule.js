/**
 * schedule.js — 2026 NFL schedule engine, built on the nflverse games feed.
 *
 * Derives: bye week per team, the bye grid, a roster bye-conflict checker,
 * kickoff datetimes (ET -> UTC, DST-aware) for the weather board, and the
 * authoritative season-kickoff anchor for countdowns.
 *
 * VERIFIED-FROM-DATA note: per the nflverse 2026 schedule, the FIRST Week-1
 * game is Wed Sep 9, 2026 (NE @ SEA, 20:20 ET) — one day before the commonly
 * assumed "Thursday Sep 10" opener (which is SF @ LAR in Melbourne). We anchor
 * the season to the first actual game and surface both. "Verify from data,
 * don't trust me." Pure module, fixture-tested (GV9).
 */

const MS_PER_DAY = 86400000;

// ---- US Eastern <-> UTC (DST aware) ----------------------------------------

function firstSundayOfMonth(year, month /* 1-12 */) {
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return dow === 0 ? 1 : 8 - dow;
}
function nthSundayOfMonth(year, month, n) {
  return firstSundayOfMonth(year, month) + (n - 1) * 7;
}
/** Is the given calendar date within US Eastern Daylight Time? */
export function isUsEasternDst(year, month, day) {
  const start = Date.UTC(year, 2, nthSundayOfMonth(year, 3, 2)); // 2nd Sunday March
  const end = Date.UTC(year, 10, firstSundayOfMonth(year, 11));  // 1st Sunday November
  const d = Date.UTC(year, month - 1, day);
  return d >= start && d < end;
}
/** Eastern offset from UTC in hours (4 during EDT, 5 during EST). */
export function easternOffsetHours(year, month, day) {
  return isUsEasternDst(year, month, day) ? 4 : 5;
}

/**
 * Build a UTC Date for a game's kickoff from its ET wall-clock time.
 * @returns {Date|null} null when gametime is TBD/blank.
 */
export function kickoffDatetime(game) {
  if (!game || !game.gameday || !game.gametime) return null;
  const [y, m, d] = game.gameday.split('-').map(Number);
  const [hh, mm] = game.gametime.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  const off = easternOffsetHours(y, m, d);
  return new Date(Date.UTC(y, m - 1, d, hh + off, mm));
}

// ---- Parsing + derived views -----------------------------------------------

export function parseSchedule(scheduleJson) {
  const games = (scheduleJson.games || []).map((g) => ({ ...g }));
  const season = scheduleJson.season;
  const reg = games.filter((g) => g.game_type === 'REG');
  const teams = [...new Set(reg.flatMap((g) => [g.home, g.away]))].sort();
  const weeks = [...new Set(reg.map((g) => g.week))].sort((a, b) => a - b);
  return { season, games, reg, teams, weeks };
}

/** Bye week per team (single week in the modern NFL). Returns { TEAM: week }. */
export function getByeWeeks(schedule) {
  const s = normalize(schedule);
  const out = {};
  for (const t of s.teams) {
    const played = new Set(s.reg.filter((g) => g.home === t || g.away === t).map((g) => g.week));
    const byes = s.weeks.filter((w) => !played.has(w));
    out[t] = byes.length === 1 ? byes[0] : (byes.length === 0 ? null : byes);
  }
  return out;
}

/** Bye grid: { week: [teams on bye] }, weeks with any bye only. */
export function getByeGrid(schedule) {
  const s = normalize(schedule);
  const byes = getByeWeeks(schedule);
  const grid = {};
  for (const [team, wk] of Object.entries(byes)) {
    const weeksArr = Array.isArray(wk) ? wk : (wk == null ? [] : [wk]);
    for (const w of weeksArr) (grid[w] ||= []).push(team);
  }
  for (const w of Object.keys(grid)) grid[w].sort();
  return grid;
}

/**
 * Roster bye-conflict checker.
 * @param {object} schedule
 * @param {Array<{name?:string, team:string}>|string[]} roster  players or team codes
 * @param {number} [flagThreshold=2] weeks with >= this many byes are flagged
 */
export function checkByeConflicts(schedule, roster, flagThreshold = 2) {
  const byes = getByeWeeks(schedule);
  const players = (roster || []).map((p) => (typeof p === 'string' ? { name: p, team: p } : p));
  const byWeek = {};
  const unresolved = [];
  for (const p of players) {
    const team = String(p.team || '').toUpperCase();
    const wk = byes[team];
    if (wk == null) { unresolved.push(p); continue; }
    const weeksArr = Array.isArray(wk) ? wk : [wk];
    for (const w of weeksArr) (byWeek[w] ||= []).push({ ...p, team });
  }
  const conflicts = Object.entries(byWeek)
    .filter(([, ps]) => ps.length >= flagThreshold)
    .map(([week, ps]) => ({ week: Number(week), count: ps.length, players: ps }))
    .sort((a, b) => a.week - b.week);
  return { byWeek, conflicts, unresolved, worstWeek: conflicts[0]?.week ?? null };
}

// ---- Season kickoff + countdown --------------------------------------------

/**
 * The authoritative season kickoff = the earliest REG game (data-derived).
 * @returns {{ game:object, gameday:string, gametime:string|null, kickoffUtc:Date|null, iso:string|null,
 *             marqueeNote:string }}
 */
export function getSeasonKickoff(schedule) {
  const s = normalize(schedule);
  const sorted = s.reg
    .filter((g) => g.week === Math.min(...s.weeks))
    .slice()
    .sort((a, b) => (`${a.gameday}T${a.gametime || '99:99'}`).localeCompare(`${b.gameday}T${b.gametime || '99:99'}`));
  const first = sorted[0];
  const kickoffUtc = first ? kickoffDatetime(first) : null;
  return {
    game: first,
    gameday: first?.gameday || null,
    gametime: first?.gametime || null,
    weekday: first?.weekday || null,
    kickoffUtc,
    iso: kickoffUtc ? kickoffUtc.toISOString() : null,
    marqueeNote:
      'First game of the 2026 season per the nflverse schedule. The marquee Thursday opener may be a separate international game — this anchor is the true first kickoff.',
  };
}

/** Whole days between two dates (date-only, UTC). GV9: 2026-07-12 -> 2026-09-10 = 60. */
export function daysBetween(from, to) {
  const a = dateOnlyUtc(from);
  const b = dateOnlyUtc(to);
  return Math.round((b - a) / MS_PER_DAY);
}

function dateOnlyUtc(x) {
  const d = x instanceof Date ? x : new Date(x);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Countdown breakdown from `now` to `target`. Renders statically if JS is off. */
export function getCountdown(now, target) {
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const tMs = (target instanceof Date ? target : new Date(target)).getTime();
  let diff = Math.max(0, tMs - nowMs);
  const past = tMs <= nowMs;
  const days = Math.floor(diff / MS_PER_DAY); diff -= days * MS_PER_DAY;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000); diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return { days, hours, minutes, seconds, past, totalMs: Math.max(0, tMs - nowMs) };
}

function normalize(schedule) {
  return schedule && schedule.reg ? schedule : parseSchedule(schedule);
}
