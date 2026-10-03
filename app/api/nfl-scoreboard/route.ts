import {
  mapEspnScoreboard,
  scoreboardWindowDays,
  type EspnRawEvent,
  type NflScoreboardPayload,
} from "@/lib/nfl-scoreboard";

/**
 * Live NFL scoreboard for the landing-page ticker and the finals strip.
 * ESPN's public scoreboard feed (the same upstream the dataset build uses,
 * and the same event ids), polled for yesterday/today/tomorrow so in-progress
 * games and fresh finals arrive without a redeploy.
 *
 * Caching: a module-scope isolate cache serves repeats for 60 seconds, so
 * ticker bursts and strip refetches cost at most one upstream set per isolate
 * per minute. Browsers additionally keep the response for 30s via
 * Cache-Control.
 *
 * Degradation is by design: missing upstream or malformed payloads return 200
 * with an empty event list so the live surfaces hide their sections instead of
 * surfacing an error (mirrors the injuries + CFB Apex scoreboard routes).
 */

export const revalidate = 0;

const CACHE_TTL_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 6_000;
const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

let cached: { at: number; payload: NflScoreboardPayload } | null = null;

function degradedPayload(nowMs: number): NflScoreboardPayload {
  return {
    events: [],
    asOf: new Date(nowMs).toISOString(),
    source: "none",
    degraded: true,
  };
}

async function fetchDay(ymd: string): Promise<EspnRawEvent[]> {
  const response = await fetch(`${ESPN_SCOREBOARD}?dates=${ymd}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      referer: "https://www.espn.com/",
    },
  });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  const events = (body as { events?: unknown } | null)?.events;
  return Array.isArray(events) ? (events as EspnRawEvent[]) : [];
}

async function fetchScoreboard(nowMs: number): Promise<NflScoreboardPayload> {
  const days = scoreboardWindowDays(new Date(nowMs));
  const dayResults = await Promise.all(days.map((day) => fetchDay(day).catch(() => [] as EspnRawEvent[])));
  const events = mapEspnScoreboard(dayResults.flat());
  if (events.length === 0) return degradedPayload(nowMs);
  return {
    events,
    asOf: new Date(nowMs).toISOString(),
    source: "espn",
    degraded: false,
  };
}

export async function GET() {
  const nowMs = Date.now();
  if (cached && nowMs - cached.at < CACHE_TTL_MS) {
    return Response.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }
  const payload = await fetchScoreboard(nowMs);
  cached = { at: nowMs, payload };
  return Response.json(payload, {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
