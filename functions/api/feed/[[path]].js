/**
 * Edge-cache feed proxy — /api/feed/<id>[?query]
 *
 * The browser never calls Sleeper/FFC/Open-Meteo directly (CORS + their
 * politeness rules). This Function fetches upstream ONCE, caches the result in
 * KV with a generous TTL (this data moves daily, not by the minute), sends a
 * descriptive User-Agent, and serves JSON with attribution headers.
 *
 * The ~5MB Sleeper player DB is NOT fetched on-demand here — it is refreshed
 * once/day by a scheduled job into KV (see docs/ops-runbook.md) and served from
 * that snapshot. Everything else is fetch-through-cache.
 */

const FEEDS = {
  sleeper_state_nfl:     { url: 'https://api.sleeper.app/v1/state/nfl', ttl: 3600 },
  sleeper_trending_add:  { url: 'https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25', ttl: 3600, attribution: 'Trending data provided by Sleeper' },
  sleeper_trending_drop: { url: 'https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=25', ttl: 3600, attribution: 'Trending data provided by Sleeper' },
  sleeper_players_nfl:   { url: 'https://api.sleeper.app/v1/players/nfl', ttl: 86400, kvSnapshot: true, attribution: 'Data provided by Sleeper' },
  ffc_adp_ppr_12:        { url: 'https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026', ttl: 21600, attribution: 'ADP data by Fantasy Football Calculator' },
  'ffc_adp_half-ppr_12': { url: 'https://fantasyfootballcalculator.com/api/v1/adp/half-ppr?teams=12&year=2026', ttl: 21600, attribution: 'ADP data by Fantasy Football Calculator' },
  ffc_adp_standard_12:   { url: 'https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=12&year=2026', ttl: 21600, attribution: 'ADP data by Fantasy Football Calculator' },
  open_meteo_forecast:   { url: 'https://api.open-meteo.com/v1/forecast', ttl: 3600, passQuery: true, attribution: 'Weather data by Open-Meteo.com' },
};

const ALLOWED_METEO = new Set(['latitude', 'longitude', 'hourly', 'windspeed_unit', 'temperature_unit', 'precipitation_unit', 'forecast_days', 'timezone']);

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const id = Array.isArray(params.path) ? params.path[0] : params.path;
  const feed = FEEDS[id];
  if (!feed) return json({ error: 'unknown feed', id }, 404);

  const url = new URL(request.url);
  let upstream = feed.url;
  let cacheKey = 'feed:' + id;

  if (feed.passQuery) {
    // Only forward an allow-listed set of params (defense against SSRF/abuse).
    const u = new URL(feed.url);
    for (const [k, v] of url.searchParams) if (ALLOWED_METEO.has(k)) u.searchParams.set(k, v);
    // Enforce our unit + window conventions regardless of caller.
    u.searchParams.set('windspeed_unit', 'mph');
    u.searchParams.set('temperature_unit', 'fahrenheit');
    u.searchParams.set('precipitation_unit', 'inch');
    u.searchParams.set('timezone', 'GMT');
    if (!u.searchParams.get('forecast_days')) u.searchParams.set('forecast_days', '7');
    upstream = u.toString();
    cacheKey = 'feed:' + id + ':' + (u.searchParams.get('latitude') || '') + ',' + (u.searchParams.get('longitude') || '');
  }

  const kv = env.DUKE_CACHE;
  // Serve from KV if present (fresh or the daily snapshot).
  if (kv) {
    const cached = await kv.get(cacheKey);
    if (cached) return withHeaders(new Response(cached, { status: 200 }), feed, 'HIT');
    if (feed.kvSnapshot) return json({ error: 'snapshot not yet populated; scheduled job pending' }, 503);
  }

  // Fetch upstream with a descriptive UA (politeness requirement).
  let res;
  try {
    res = await fetch(upstream, {
      headers: { 'user-agent': env.FEED_USER_AGENT || 'DukeFantasy/0.1 (+https://dukefantasy.com)', accept: 'application/json' },
      cf: { cacheTtl: feed.ttl, cacheEverything: true },
    });
  } catch (err) {
    return json({ error: 'upstream fetch failed', detail: String(err) }, 502);
  }
  if (!res.ok) return json({ error: 'upstream status ' + res.status }, 502);

  const body = await res.text();
  if (kv) context.waitUntil(kv.put(cacheKey, body, { expirationTtl: Math.max(60, feed.ttl) }));
  return withHeaders(new Response(body, { status: 200 }), feed, 'MISS');
}

function withHeaders(res, feed, cacheState) {
  const h = new Headers(res.headers);
  h.set('content-type', 'application/json; charset=utf-8');
  h.set('cache-control', `public, max-age=${Math.min(feed.ttl, 600)}, s-maxage=${feed.ttl}`);
  h.set('x-duke-cache', cacheState);
  if (feed.attribution) h.set('x-data-attribution', feed.attribution);
  h.set('access-control-allow-origin', 'same-origin');
  return new Response(res.body, { status: res.status, headers: h });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
