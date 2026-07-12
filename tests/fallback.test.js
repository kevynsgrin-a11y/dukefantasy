import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFeed } from '../src/engine/util/feed.js';
import { assessStaleness, formatAsOf, draftDataStamp } from '../src/engine/util/staleness.js';

function memStore(initial) {
  const m = new Map(Object.entries(initial || {}));
  return { get: (k) => m.get(k) || null, set: (k, v) => m.set(k, v), _map: m };
}

test('GV12 — triple fallback: edge -> direct -> last-good; never blank', async () => {
  const store = memStore();
  const now = new Date('2026-07-12T12:00:00Z');

  // Edge succeeds -> use edge and refresh cache.
  let r = await loadFeed({
    id: 'adp', staleWarnAfterHours: 48, store, now,
    attempts: [
      { origin: 'edge', load: async () => ({ v: 'edge-data' }) },
      { origin: 'direct', load: async () => ({ v: 'direct-data' }) },
    ],
  });
  assert.equal(r.origin, 'edge');
  assert.equal(r.ok, true);
  assert.equal(r.data.v, 'edge-data');
  assert.deepEqual(store.get('adp').data, { v: 'edge-data' });

  // Edge down -> direct.
  r = await loadFeed({
    id: 'adp', staleWarnAfterHours: 48, store, now,
    attempts: [
      { origin: 'edge', load: async () => { throw new Error('edge 503'); } },
      { origin: 'direct', load: async () => ({ v: 'direct-data' }) },
    ],
  });
  assert.equal(r.origin, 'direct');
  assert.equal(r.data.v, 'direct-data');

  // Both down -> last-good cache (stale, stamped notice).
  r = await loadFeed({
    id: 'adp', staleWarnAfterHours: 48, now: new Date('2026-07-15T12:00:00Z'), store,
    attempts: [
      { origin: 'edge', load: async () => { throw new Error('edge 503'); } },
      { origin: 'direct', load: async () => { throw new Error('direct timeout'); } },
    ],
  });
  assert.equal(r.origin, 'cache');
  assert.equal(r.stale, true);
  assert.ok(r.notice, 'stale notice present');
  assert.equal(r.data.v, 'direct-data'); // last good written earlier

  // Everything down and no cache -> ok:false but never throws / never blank notice.
  const empty = memStore();
  r = await loadFeed({
    id: 'nope', store: empty, now,
    attempts: [{ origin: 'edge', load: async () => { throw new Error('x'); } }],
  });
  assert.equal(r.ok, false);
  assert.equal(r.origin, 'none');
  assert.ok(r.notice);
});

test('staleness assessment + stamp', () => {
  const now = new Date('2026-07-12T12:00:00Z');
  const fresh = assessStaleness('2026-07-12T00:00:00Z', 48, now);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.asOf, 'Jul 12, 2026');

  const stale = assessStaleness('2026-07-08T00:00:00Z', 48, now);
  assert.equal(stale.stale, true);
  assert.match(stale.notice, /last good copy/i);

  assert.equal(formatAsOf('2026-09-10T00:00:00Z'), 'Sep 10, 2026');
  assert.equal(draftDataStamp({ fetchedAt: '2026-07-12', count: 412, now }).text, 'as of Jul 12, 2026, 412 drafts');
});
