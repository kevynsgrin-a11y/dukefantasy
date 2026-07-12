/**
 * Data-freshness stamping — the portfolio "honesty covenant" in code.
 *
 * Every dataset we render carries a visible "as of" stamp and, when it ages past
 * its threshold, a staleness strip. Pure date math; no DOM. `now` is injectable
 * so this is deterministic in tests.
 */

const MS_PER_HOUR = 3600 * 1000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul 12, 2026" — stable, locale-independent, UTC-based. */
export function formatAsOf(when) {
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return 'unknown date';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Jul 12, 2026, 14:30 UTC" for finer stamps (weather fetch time). */
export function formatAsOfTime(when) {
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return 'unknown time';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${formatAsOf(d)}, ${hh}:${mm} UTC`;
}

/**
 * Assess whether a dataset is stale.
 * @param {Date|string|number} fetchedAt  when the data was produced/fetched
 * @param {number} staleWarnAfterHours     threshold from the source manifest
 * @param {Date|string|number} [now]       injectable clock
 * @returns {{ ageHours:number, stale:boolean, asOf:string, asOfTime:string, notice:string|null }}
 */
export function assessStaleness(fetchedAt, staleWarnAfterHours, now = new Date()) {
  const then = (fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt)).getTime();
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const ageHours = (nowMs - then) / MS_PER_HOUR;
  const stale = Number.isFinite(staleWarnAfterHours) && ageHours > staleWarnAfterHours;
  return {
    ageHours: Math.round(ageHours * 10) / 10,
    stale,
    asOf: formatAsOf(then),
    asOfTime: formatAsOfTime(then),
    notice: stale
      ? `Heads up: this data is ${describeAge(ageHours)} old (fetched ${formatAsOf(then)}). Upstream may be lagging — we show the last good copy rather than nothing.`
      : null,
  };
}

/** Human age like "2 days", "5 hours". */
export function describeAge(ageHours) {
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))} minutes`;
  if (ageHours < 48) return `${Math.round(ageHours)} hours`;
  return `${Math.round(ageHours / 24)} days`;
}

/** Build the standard "ADP as of {date}, {n} drafts"-style stamp payload. */
export function draftDataStamp({ fetchedAt, count, unit = 'drafts', now = new Date() }) {
  const s = assessStaleness(fetchedAt, Infinity, now);
  return {
    asOf: s.asOf,
    count,
    unit,
    text: count != null ? `as of ${s.asOf}, ${count} ${unit}` : `as of ${s.asOf}`,
  };
}
