/**
 * daily-snapshot.js — standalone Cloudflare Worker (cron-triggered).
 *
 * Sleeper asks callers to pull the ~5MB /players/nfl DB AT MOST once per day and
 * cache it. Pages Functions are request-triggered, so this dedicated Worker runs
 * on a daily cron, fetches the player DB with a descriptive User-Agent, and
 * writes it into the shared DUKE_CACHE KV under the same key the feed proxy
 * serves (`feed:sleeper_players_nfl`). It also warms the trending + state feeds.
 *
 * Deploy separately (see docs/ops-runbook.md):
 *   wrangler deploy workers/daily-snapshot.js  (bind DUKE_CACHE + set a cron)
 * wrangler.jsonc for this worker:
 *   { "name": "duke-daily-snapshot", "main": "workers/daily-snapshot.js",
 *     "triggers": { "crons": ["17 9 * * *"] },
 *     "kv_namespaces": [{ "binding": "DUKE_CACHE", "id": "<same as Pages>" }],
 *     "vars": { "FEED_USER_AGENT": "DukeFantasy/1.0 (+https://dukefantasy.com; hello@dukefantasy.com)" } }
 */

const UA_DEFAULT = 'DukeFantasy/1.0 (+https://dukefantasy.com; hello@dukefantasy.com)';

const WARM = [
  { key: 'feed:sleeper_players_nfl', url: 'https://api.sleeper.app/v1/players/nfl', ttl: 172800 },
  { key: 'feed:sleeper_trending_add', url: 'https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50', ttl: 7200 },
  { key: 'feed:sleeper_trending_drop', url: 'https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=50', ttl: 7200 },
  { key: 'feed:sleeper_state_nfl', url: 'https://api.sleeper.app/v1/state/nfl', ttl: 7200 },
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAll(env));
  },
  // Manual trigger for ops: GET /?token=<SNAPSHOT_TOKEN>
  async fetch(request, env) {
    const url = new URL(request.url);
    if (env.SNAPSHOT_TOKEN && url.searchParams.get('token') === env.SNAPSHOT_TOKEN) {
      const report = await refreshAll(env);
      return new Response(JSON.stringify(report, null, 2), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('duke-daily-snapshot: cron worker. POST/GET with token to run manually.', { status: 200 });
  },
};

async function refreshAll(env) {
  const ua = env.FEED_USER_AGENT || UA_DEFAULT;
  const report = {};
  for (const feed of WARM) {
    try {
      const res = await fetch(feed.url, { headers: { 'user-agent': ua, accept: 'application/json' } });
      if (!res.ok) { report[feed.key] = 'http ' + res.status; continue; }
      const body = await res.text();
      await env.DUKE_CACHE.put(feed.key, body, { expirationTtl: feed.ttl });
      report[feed.key] = 'ok (' + body.length + ' bytes)';
    } catch (err) {
      report[feed.key] = 'error: ' + String(err);
    }
  }
  return report;
}
