/**
 * Minimal, dependency-free iCalendar (.ics) generation — RFC 5545 subset.
 *
 * Reused by the "Draft Party" invite (flagship reveal) and the draft countdown.
 * Pure: produces a string. Times are emitted in UTC (Z). For deterministic
 * output (tests, verifiable permalinks) pass an explicit `uid` and `dtstamp`;
 * otherwise callers in the browser may let them default.
 */

function pad(n) { return String(n).padStart(2, '0'); }

/** Format a Date (or ISO string / epoch ms) as an iCalendar UTC timestamp. */
export function toIcsUtc(when) {
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) throw new Error('ics: invalid date: ' + when);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape a TEXT value per RFC 5545 (backslash, semicolon, comma, newlines). */
export function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold a content line to <=75 octets with CRLF + single leading space. */
function foldLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let i = 0;
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join('\r\n');
}

/**
 * Build a single-event calendar string.
 *
 * @param {object} ev
 * @param {string} ev.title            SUMMARY
 * @param {Date|string|number} ev.start DTSTART
 * @param {Date|string|number} [ev.end] DTEND (or use durationMinutes)
 * @param {number} [ev.durationMinutes=60]
 * @param {string} [ev.description]
 * @param {string} [ev.location]
 * @param {string} [ev.url]
 * @param {string} [ev.uid]            stable UID (recommended for shareable/tested output)
 * @param {Date|string|number} [ev.dtstamp] stable creation stamp (recommended for tests)
 * @param {string} [ev.prodId]
 * @returns {string} an RFC-5545 VCALENDAR with one VEVENT, CRLF-terminated
 */
export function buildIcs(ev) {
  const start = ev.start;
  const end = ev.end != null
    ? ev.end
    : new Date((start instanceof Date ? start : new Date(start)).getTime() + (ev.durationMinutes ?? 60) * 60000);

  const uid = ev.uid || `${toIcsUtc(start)}-${Math.abs(hashStr(ev.title + '|' + toIcsUtc(start)))}@dukefantasy.com`;
  const dtstamp = ev.dtstamp != null ? ev.dtstamp : start;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:' + escapeText(ev.prodId || '-//DukeFantasy//Draft Tools//EN'),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + toIcsUtc(dtstamp),
    'DTSTART:' + toIcsUtc(start),
    'DTEND:' + toIcsUtc(end),
    'SUMMARY:' + escapeText(ev.title),
  ];
  if (ev.description) lines.push('DESCRIPTION:' + escapeText(ev.description));
  if (ev.location) lines.push('LOCATION:' + escapeText(ev.location));
  if (ev.url) lines.push('URL:' + escapeText(ev.url));
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Tiny stable string hash for default UIDs (not cryptographic). */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
