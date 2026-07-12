/**
 * trending.js — Sleeper waiver radar (in-season retention layer).
 *
 * Joins Sleeper trending adds/drops through the identity registry into a daily
 * board with counts, position filters, and data-as-of stamps. DESCRIPTIVE, not
 * prescriptive ("most added in the last 24h") — that keeps us squarely in the
 * data lane, not the start/sit advice lane. Pure module, fixture-tested.
 */

import { formatAsOf } from './util/staleness.js';

/**
 * @param {Array<{player_id:string,count:number}>} trending  Sleeper trending array
 * @param {object} registry  identity registry (byId)
 * @param {object} [opts] { direction:'add'|'drop', position, limit, lookbackHours, fetchedAt, now }
 */
export function buildTrendingBoard(trending, registry, opts = {}) {
  const direction = opts.direction || 'add';
  const lookbackHours = opts.lookbackHours || 24;
  const rows = [];
  const unresolved = [];
  for (const t of (Array.isArray(trending) ? trending : (trending?.trending || []))) {
    const p = registry?.byId?.get(String(t.player_id));
    if (!p) { unresolved.push(t); continue; }
    const pos = String(p.position || '').toUpperCase();
    if (opts.position && pos !== String(opts.position).toUpperCase()) continue;
    rows.push({
      playerId: t.player_id,
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      position: pos,
      team: p.team || null,
      count: Number(t.count) || 0,
    });
  }
  rows.sort((a, b) => b.count - a.count);
  const limited = opts.limit ? rows.slice(0, opts.limit) : rows;
  const stampDate = opts.fetchedAt || opts.now || new Date();
  return {
    direction,
    lookbackHours,
    headline: direction === 'add' ? `Most added in the last ${lookbackHours}h` : `Most dropped in the last ${lookbackHours}h`,
    disclaimer: 'This is transaction volume across Sleeper leagues — what the market is doing, not a start/sit call.',
    asOf: formatAsOf(stampDate),
    attribution: 'Trending data provided by Sleeper',
    rows: limited,
    unresolved,
    stats: { total: rows.length, shown: limited.length, unresolved: unresolved.length },
  };
}
