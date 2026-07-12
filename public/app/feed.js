/**
 * feed.js — browser feed client. Honors the triple-fallback covenant:
 *   edge Function (/api/feed/<id>) -> bundled last-good fixture (/data/<file>)
 *   -> localStorage last-good. Never blank; always stamped.
 *
 * Client-direct calls to Sleeper/FFC/Open-Meteo are intentionally NOT attempted
 * from the browser (CORS + their politeness rules) — that is the edge Function's
 * job. The bundled fixture under /data acts as the shipped last-good baseline so
 * every tool renders instantly, offline, on first paint.
 */

import { loadFeed } from '/engine/util/feed.js';

function localStore() {
  return {
    get(key) {
      try { const raw = localStorage.getItem('duke-feed:' + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    set(key, val) {
      try { localStorage.setItem('duke-feed:' + key, JSON.stringify(val)); } catch { /* quota; ignore */ }
    },
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(url + ' -> ' + res.status);
  return res.json();
}

/**
 * Load a feed by manifest id.
 * @param {object} cfg
 * @param {string} cfg.id                 manifest id (also the edge path + cache key)
 * @param {string} [cfg.fixture]          bundled baseline filename under /data
 * @param {number} [cfg.staleWarnAfterHours=48]
 * @param {(raw:any)=>any} [cfg.parse]    optional transform of the raw payload
 * @returns {Promise<{data, origin, ok, stale, asOf, notice}>}
 */
export async function getFeed({ id, fixture, staleWarnAfterHours = 48, parse } = {}) {
  const store = localStore();
  const attempts = [
    { origin: 'edge', load: async () => { const j = await fetchJson('/api/feed/' + id); return parse ? parse(j) : j; } },
  ];
  // Seed the store from the bundled fixture the first time (shipped last-good).
  if (fixture && !store.get(id)) {
    try {
      const raw = await fetchJson('/data/' + fixture);
      store.set(id, { data: parse ? parse(raw) : raw, fetchedAt: Date.parse(raw?._meta?.last_verified || '') || Date.now() });
    } catch { /* fixture missing; loadFeed will report unavailable */ }
  }
  return loadFeed({ id, attempts, staleWarnAfterHours, store });
}
