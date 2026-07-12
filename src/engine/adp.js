/**
 * adp.js — Average Draft Position engine.
 *
 * Honesty rails (the whole point):
 *   - Scoring format + league size are FIRST-CLASS LABELS on every series. We
 *     never blend PPR and standard into one number silently — computeConsensus
 *     throws if you try (GV8).
 *   - Per-source split + delta view ("goes 14 picks later on FFC standard than
 *     half-PPR"), plain-language framed, both formats labeled.
 *   - Market-tier clustering is a documented, deterministic 1-D gap algorithm
 *     over ADP values, labeled as MARKET BEHAVIOR — not expert opinion. That is
 *     both the honesty stance and the legal safety line.
 *   - Staleness stamps ("ADP as of {date}, {n} drafts").
 *
 * ADP is market data (where players actually go in real drafts). It is not a
 * ranking, projection, or opinion. Pure module, fixture-tested.
 */

import { normalizeName } from './identity.js';
import { draftDataStamp } from './util/staleness.js';

export const SCORING_FORMATS = Object.freeze({
  standard: 'Standard (non-PPR)',
  'half-ppr': 'Half-PPR',
  ppr: 'Full PPR',
  '2qb': '2QB / Superflex',
  dynasty: 'Dynasty',
  rookie: 'Rookie',
});

/** Stable identity key for joining ADP rows across sources/formats. */
export function adpKey(row) {
  const nm = normalizeName(row.name);
  const pos = String(row.position || '').toUpperCase();
  const team = String(row.team || '').toUpperCase();
  return `${nm.baseCompact}|${pos}|${team}`;
}

/**
 * Parse a Fantasy Football Calculator ADP payload into a normalized series.
 * @param {object} json  FFC response (meta + players[])
 * @param {object} [ctx] { fetchedAt } — when the payload was fetched
 */
export function parseFfcAdp(json, ctx = {}) {
  if (!json || !Array.isArray(json.players)) throw new Error('adp: not an FFC ADP payload');
  const meta = json.meta || {};
  const format = String(meta.type || 'ppr').toLowerCase();
  const players = json.players
    .filter((p) => p && p.name && Number.isFinite(Number(p.adp)))
    .map((p) => ({
      name: p.name,
      position: String(p.position || '').toUpperCase(),
      team: String(p.team || '').toUpperCase(),
      adp: Number(p.adp),
      adpFormatted: p.adp_formatted || null,
      timesDrafted: Number(p.times_drafted) || 0,
      high: Number(p.high) || null,
      low: Number(p.low) || null,
      stdev: Number(p.stdev) || null,
      bye: p.bye != null ? Number(p.bye) : null,
    }));
  return {
    source: 'ffc',
    sourceLabel: 'Fantasy Football Calculator',
    attribution: 'ADP data by Fantasy Football Calculator',
    format,
    formatLabel: SCORING_FORMATS[format] || format,
    teams: Number(meta.teams) || null,
    year: Number(meta.year) || null,
    drafts: Number(meta.total_drafts) || null,
    dateRange: meta.start_date && meta.end_date ? { start: meta.start_date, end: meta.end_date } : null,
    fetchedAt: ctx.fetchedAt || meta.end_date || null,
    players,
  };
}

/** Staleness stamp for a series: "ADP as of {date}, {n} drafts". */
export function adpStamp(series, now = new Date()) {
  const s = draftDataStamp({ fetchedAt: series.fetchedAt || series.dateRange?.end, count: series.drafts, unit: 'drafts', now });
  return { ...s, text: `${series.formatLabel} ADP · ${s.text}`, format: series.format, teams: series.teams };
}

function assertSameFormat(seriesList) {
  const formats = new Set(seriesList.map((s) => s.format));
  const teams = new Set(seriesList.map((s) => s.teams));
  if (formats.size > 1) {
    throw new Error(`adp: refusing to blend scoring formats into one consensus (${[...formats].join(', ')}). Format is part of the identity — compare them side-by-side instead.`);
  }
  if (teams.size > 1) {
    throw new Error(`adp: refusing to blend league sizes into one consensus (${[...teams].join(', ')}-team).`);
  }
}

/**
 * Consensus ADP across LIKE-FORMAT sources. Throws if formats/sizes differ.
 * Averages each player's ADP weighted by times_drafted.
 */
export function computeConsensus(seriesList) {
  if (!Array.isArray(seriesList) || seriesList.length === 0) throw new Error('adp: no series');
  assertSameFormat(seriesList);
  const agg = new Map();
  for (const s of seriesList) {
    for (const p of s.players) {
      const k = adpKey(p);
      const w = Math.max(1, p.timesDrafted || 1);
      const cur = agg.get(k) || { ...p, _wsum: 0, _adpw: 0, sources: [] };
      cur._adpw += p.adp * w;
      cur._wsum += w;
      cur.sources.push(s.source);
      agg.set(k, cur);
    }
  }
  const players = [...agg.values()].map((c) => ({
    name: c.name, position: c.position, team: c.team,
    adp: Math.round((c._adpw / c._wsum) * 10) / 10,
    sources: [...new Set(c.sources)],
    bye: c.bye,
  })).sort((a, b) => a.adp - b.adp);
  const base = seriesList[0];
  return { ...base, source: 'consensus', sourceLabel: 'Consensus (like-format)', players };
}

/**
 * Delta view: how a player's ADP differs between two series (may be different
 * formats — that IS the compare view). Positive delta = later in B.
 */
export function computeDeltas(seriesA, seriesB) {
  const bByKey = new Map(seriesB.players.map((p) => [adpKey(p), p]));
  const rows = [];
  for (const a of seriesA.players) {
    const b = bByKey.get(adpKey(a));
    if (!b) continue;
    const delta = Math.round((b.adp - a.adp) * 10) / 10;
    rows.push({
      name: a.name, position: a.position, team: a.team,
      adpA: a.adp, adpB: b.adp, delta,
      formatA: seriesA.format, formatB: seriesB.format,
      framing: describeDelta(delta, seriesA.formatLabel, seriesB.formatLabel),
    });
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return {
    formatA: seriesA.format, formatB: seriesB.format,
    labelA: seriesA.formatLabel, labelB: seriesB.formatLabel,
    rows,
  };
}

function describeDelta(delta, labelA, labelB) {
  if (delta === 0) return `Same ADP in ${labelA} and ${labelB}.`;
  const later = delta > 0 ? labelB : labelA;
  const earlier = delta > 0 ? labelA : labelB;
  return `Goes ${Math.abs(delta)} picks later in ${later} than ${earlier}.`;
}

/**
 * Market-tier clustering — deterministic 1-D gap clustering over ADP.
 * A new tier begins wherever the gap to the next player exceeds
 * `gapFactor` x the median positive gap (with an absolute `minGap` floor).
 * Labeled as MARKET behavior, never expert opinion.
 *
 * @param {object} series
 * @param {object} [opts] { gapFactor=2.5, minGap=0, maxTierSize=Infinity }
 * @returns {{ tiers: Array<{tier:number, players:Array, adpStart:number, adpEnd:number}>, threshold:number, gapFactor:number }}
 */
export function clusterTiers(series, opts = {}) {
  const gapFactor = opts.gapFactor ?? 2.5;
  const minGap = opts.minGap ?? 0;
  const maxTierSize = opts.maxTierSize ?? Infinity;

  const sorted = series.players
    .filter((p) => Number.isFinite(p.adp))
    .slice()
    .sort((a, b) => a.adp - b.adp || adpKey(a).localeCompare(adpKey(b)));
  if (sorted.length === 0) return { tiers: [], threshold: 0, gapFactor };

  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].adp - sorted[i - 1].adp);
  const median = medianOf(gaps.filter((g) => g > 0));
  const threshold = Math.max(minGap, gapFactor * (median || 0)) || Infinity;

  const tiers = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].adp - sorted[i - 1].adp;
    if (gap > threshold || current.length >= maxTierSize) {
      tiers.push(current);
      current = [];
    }
    current.push(sorted[i]);
  }
  if (current.length) tiers.push(current);

  return {
    tiers: tiers.map((players, idx) => ({
      tier: idx + 1,
      players,
      adpStart: players[0].adp,
      adpEnd: players[players.length - 1].adp,
    })),
    threshold,
    gapFactor,
    format: series.format,
    formatLabel: series.formatLabel,
  };
}

function medianOf(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Movement between a current series and a prior snapshot (1/3/7-day boards).
 * Positive movement = ADP rising (drafted earlier now). Only where history exists.
 */
export function computeMovement(current, previous) {
  const prevByKey = new Map(previous.players.map((p) => [adpKey(p), p]));
  const rows = [];
  for (const c of current.players) {
    const p = prevByKey.get(adpKey(c));
    if (!p) continue;
    const move = Math.round((p.adp - c.adp) * 10) / 10; // positive => rose (lower adp now)
    if (move !== 0) rows.push({ name: c.name, position: c.position, team: c.team, adpNow: c.adp, adpPrev: p.adp, movement: move });
  }
  rows.sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
  return rows;
}
