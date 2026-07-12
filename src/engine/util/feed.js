/**
 * Triple-fallback feed loader — the "never blank" covenant.
 *
 * Order of attempts: edge-cache Function -> direct upstream -> last-good copy
 * in local storage (client) or an injected cache (tests). Whatever we return is
 * stamped with its origin and staleness so the UI can always show provenance.
 *
 * Pure orchestration via dependency injection: callers pass async loaders and a
 * key/value store, so this is fully testable in Node with fakes and carries no
 * DOM coupling. The browser wires `edge` to /api/feed/*, `direct` to the source
 * URL, and `store` to a localStorage adapter.
 */

import { assessStaleness } from './staleness.js';

/**
 * @param {object} opts
 * @param {string} opts.id                  feed id (also the last-good store key)
 * @param {Array<{origin:string, load:() => Promise<any>}>} opts.attempts
 *        ordered live attempts (e.g. edge then direct). Each `load` resolves to
 *        parsed data or throws/returns null on failure.
 * @param {number} opts.staleWarnAfterHours  threshold from the manifest
 * @param {{ get:(k:string)=>Promise<any>|any, set:(k:string,v:any)=>any }} [opts.store]
 *        last-good store. `get` returns `{ data, fetchedAt }` or null.
 * @param {Date|string|number} [opts.now]    injectable clock
 * @returns {Promise<{ data:any, origin:string, ok:boolean, stale:boolean,
 *                     asOf:string, fetchedAt:number|null, notice:string|null,
 *                     errors:string[] }>}
 */
export async function loadFeed(opts) {
  const { id, attempts = [], staleWarnAfterHours = Infinity, store, now = new Date() } = opts;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const errors = [];

  for (const attempt of attempts) {
    try {
      const data = await attempt.load();
      if (data == null) { errors.push(`${attempt.origin}: empty`); continue; }
      // Success from a live source -> refresh the last-good copy.
      if (store && typeof store.set === 'function') {
        try { await store.set(id, { data, fetchedAt: nowMs }); } catch { /* non-fatal */ }
      }
      const s = assessStaleness(nowMs, staleWarnAfterHours, nowMs);
      return {
        data, origin: attempt.origin, ok: true, stale: s.stale,
        asOf: s.asOf, fetchedAt: nowMs, notice: null, errors,
      };
    } catch (err) {
      errors.push(`${attempt.origin}: ${err && err.message ? err.message : String(err)}`);
    }
  }

  // All live attempts failed -> fall back to last-good.
  if (store && typeof store.get === 'function') {
    let cached = null;
    try { cached = await store.get(id); } catch { cached = null; }
    if (cached && cached.data != null) {
      const s = assessStaleness(cached.fetchedAt ?? nowMs, staleWarnAfterHours, nowMs);
      return {
        data: cached.data, origin: 'cache', ok: true, stale: true,
        asOf: s.asOf, fetchedAt: cached.fetchedAt ?? null,
        notice: s.notice || 'Showing the last good copy — live sources are unreachable right now.',
        errors,
      };
    }
  }

  // Genuinely nothing available.
  return {
    data: null, origin: 'none', ok: false, stale: true,
    asOf: null, fetchedAt: null,
    notice: 'This data is temporarily unavailable. Please try again shortly.',
    errors,
  };
}
