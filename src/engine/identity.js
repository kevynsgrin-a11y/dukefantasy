/**
 * identity.js — the player identity layer.
 *
 * The Sleeper player DB is the canonical registry. This module builds:
 *   (a) a cross-platform ID crosswalk (espn_id, yahoo_id, rotowire_id, gsis_id,
 *       sportradar_id, ...) so any source keyed by one platform resolves to a
 *       single canonical player;
 *   (b) a name normalizer + matcher for joining sources that ship names but no
 *       IDs (like FFC ADP), handling suffixes, punctuation/apostrophes, accents,
 *       hyphen-vs-space, and D/ST naming variants — and FLAGGING genuine
 *       ambiguity (two "Josh Allen"s) instead of guessing.
 *
 * Every unmatched or ambiguous row is surfaced in a build report; nothing is
 * silently dropped or silently guessed. That is the honesty covenant at the
 * data-join layer. Pure module, fixture-tested (GV7).
 */

import { TEAM_ALIAS_TO_ABBREV } from './data/nflteams.js';

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);
const DEF_POSITIONS = new Set(['DEF', 'DST', 'D/ST']);
const CROSS_ID_FIELDS = ['espn_id', 'yahoo_id', 'rotowire_id', 'rotoworld_id', 'sportradar_id', 'gsis_id', 'stats_id', 'fantasy_data_id'];

/**
 * Normalize a player name into stable match keys.
 * @returns {{ normalized:string, compact:string, base:string, baseCompact:string, hadSuffix:boolean, tokens:string[] }}
 */
export function normalizeName(name) {
  const cleaned = String(name || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’.,]/g, '')       // drop apostrophes and periods
    .replace(/[-/]/g, ' ')        // hyphen & slash -> space
    .replace(/[^a-z0-9 ]/g, ' ')  // any other punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = cleaned ? cleaned.split(' ') : [];
  let base = tokens.slice();
  let hadSuffix = false;
  while (base.length > 2 && SUFFIXES.has(base[base.length - 1])) {
    base.pop();
    hadSuffix = true;
  }
  return {
    normalized: cleaned,
    compact: tokens.join(''),
    base: base.join(' '),
    baseCompact: base.join(''),
    hadSuffix,
    tokens,
  };
}

/** Does this row describe a team defense (D/ST)? */
export function isDefense({ name, position } = {}) {
  if (position && DEF_POSITIONS.has(String(position).toUpperCase())) return true;
  const n = normalizeName(name).normalized;
  return /\b(dst|d st|defense|special teams)\b/.test(n) || /\bdst\b/.test(n.replace(/\s+/g, ''));
}

/** Resolve a team abbreviation from a defense name and/or an explicit team code. */
export function resolveDefenseTeam({ name, team } = {}) {
  if (team) {
    const t = TEAM_ALIAS_TO_ABBREV.get(String(team).toLowerCase());
    if (t) return t;
  }
  // Strip defense words, then try the alias table on progressively shorter forms.
  const stripped = normalizeName(name).normalized
    .replace(/\b(dst|d st|defense|special teams|def)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (TEAM_ALIAS_TO_ABBREV.has(stripped)) return TEAM_ALIAS_TO_ABBREV.get(stripped);
  // Try the whole normalized name and each token/suffix combination.
  const forms = new Set([stripped, normalizeName(name).normalized]);
  const toks = stripped.split(' ').filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    forms.add(toks[i]);
    if (i < toks.length - 1) forms.add(toks[i] + ' ' + toks[i + 1]);
  }
  for (const f of forms) if (TEAM_ALIAS_TO_ABBREV.get(f)) return TEAM_ALIAS_TO_ABBREV.get(f);
  return null;
}

/**
 * Build the canonical registry from the Sleeper players object (keyed by id).
 * Keys starting with "_" (e.g. fixture _meta) are ignored.
 */
export function buildRegistry(playersObj) {
  const byId = new Map();
  const crosswalk = {}; // system -> Map(externalId -> playerId)
  for (const f of CROSS_ID_FIELDS) crosswalk[f] = new Map();
  const nameIndex = new Map();     // compact -> [playerId]
  const baseIndex = new Map();     // baseCompact -> [playerId]
  const defenses = new Map();      // teamAbbrev -> playerId

  for (const [pid, p] of Object.entries(playersObj)) {
    if (pid.startsWith('_') || !p || typeof p !== 'object') continue;
    byId.set(pid, p);

    for (const f of CROSS_ID_FIELDS) {
      const v = p[f];
      if (v != null && v !== '') crosswalk[f].set(String(v), pid);
    }

    const pos = String(p.position || '').toUpperCase();
    if (DEF_POSITIONS.has(pos)) {
      defenses.set(String(p.team || pid).toUpperCase(), pid);
      continue; // defenses are matched by team, not by the name index
    }

    const nm = normalizeName(p.full_name || `${p.first_name || ''} ${p.last_name || ''}`);
    pushIndex(nameIndex, nm.compact, pid);
    pushIndex(baseIndex, nm.baseCompact, pid);
    // Also index Sleeper's own search_full_name when present (already compacted).
    if (p.search_full_name) pushIndex(nameIndex, String(p.search_full_name).toLowerCase(), pid);
  }

  return { byId, crosswalk, nameIndex, baseIndex, defenses, size: byId.size };
}

function pushIndex(map, key, pid) {
  if (!key) return;
  const arr = map.get(key);
  if (arr) { if (!arr.includes(pid)) arr.push(pid); }
  else map.set(key, [pid]);
}

/** Resolve a canonical player id from an external platform id. */
export function resolveByExternalId(registry, system, id) {
  const field = system.endsWith('_id') ? system : system + '_id';
  const m = registry.crosswalk[field];
  return m ? (m.get(String(id)) || null) : null;
}

/**
 * Match a { name, position, team } row to a canonical player.
 * @returns {{ matched:boolean, playerId:string|null, method:string, confidence:number, candidates:string[] }}
 */
export function matchPlayer(registry, query) {
  const { name, position, team } = query || {};

  // 1) Team defenses.
  if (isDefense(query)) {
    const abbr = resolveDefenseTeam({ name, team });
    if (abbr && registry.defenses.has(abbr)) {
      return { matched: true, playerId: registry.defenses.get(abbr), method: 'team-defense', confidence: 1, candidates: [] };
    }
    return { matched: false, playerId: null, method: 'defense-unresolved', confidence: 0, candidates: [] };
  }

  const nm = normalizeName(name);
  let ids = registry.nameIndex.get(nm.compact) || [];
  let method = 'exact';
  if (ids.length === 0) {
    ids = registry.baseIndex.get(nm.baseCompact) || [];
    method = 'suffix-insensitive';
  }
  ids = [...new Set(ids)];

  if (ids.length === 0) {
    return { matched: false, playerId: null, method: 'no-match', confidence: 0, candidates: [] };
  }
  if (ids.length === 1) {
    return { matched: true, playerId: ids[0], method, confidence: method === 'exact' ? 1 : 0.95, candidates: ids };
  }

  // Multiple candidates -> disambiguate by position and/or team; never guess.
  const wantPos = position ? String(position).toUpperCase() : null;
  const wantTeam = team ? (TEAM_ALIAS_TO_ABBREV.get(String(team).toLowerCase()) || String(team).toUpperCase()) : null;
  let filtered = ids;
  if (wantPos) {
    filtered = filtered.filter((pid) => {
      const p = registry.byId.get(pid);
      const fps = (p.fantasy_positions || [p.position]).map((x) => String(x).toUpperCase());
      return fps.includes(wantPos) || String(p.position).toUpperCase() === wantPos;
    });
  }
  let teamFiltered = filtered;
  if (wantTeam) teamFiltered = filtered.filter((pid) => String(registry.byId.get(pid).team || '').toUpperCase() === wantTeam);

  if (teamFiltered.length === 1) {
    return { matched: true, playerId: teamFiltered[0], method: 'disambiguated-pos-team', confidence: 0.9, candidates: ids };
  }
  if (filtered.length === 1) {
    return { matched: true, playerId: filtered[0], method: 'disambiguated-pos', confidence: 0.8, candidates: ids };
  }

  // Still ambiguous -> FLAG, do not guess.
  return { matched: false, playerId: null, method: 'ambiguous', confidence: 0, candidates: ids };
}

/**
 * Match a list of rows and produce a build report. Unmatched and ambiguous rows
 * are surfaced, never dropped.
 * @param {object} registry
 * @param {Array<{name:string, position?:string, team?:string}>} rows
 * @returns {{ matched:Array, unmatched:Array, ambiguous:Array, stats:object }}
 */
export function buildMatchReport(registry, rows) {
  const matched = [], unmatched = [], ambiguous = [];
  for (const row of rows) {
    const r = matchPlayer(registry, row);
    if (r.matched) matched.push({ row, ...r });
    else if (r.method === 'ambiguous') ambiguous.push({ row, ...r });
    else unmatched.push({ row, ...r });
  }
  const total = rows.length;
  return {
    matched, unmatched, ambiguous,
    stats: {
      total,
      matched: matched.length,
      unmatched: unmatched.length,
      ambiguous: ambiguous.length,
      matchRate: total ? Math.round((matched.length / total) * 1000) / 10 : 0,
    },
  };
}
