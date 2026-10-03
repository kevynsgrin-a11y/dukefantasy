/**
 * Live NFL scoreboard normalization for ESPN's public scoreboard feed.
 *
 * Pure module: the API route performs the fetches, this file maps the raw
 * provider events onto the compact shape the ticker overlay and the finals
 * strip render. Event ids are ESPN event ids — the same ids the dataset
 * build bakes into `games`, so the client overlay matches games exactly
 * instead of by name heuristics. On any upstream failure the route degrades
 * to an empty event list and the live surfaces hide themselves (no error
 * surface on the landing page).
 */

export type NflGameState =
  | "scheduled"
  | "live"
  | "halftime"
  | "final"
  | "postponed"
  | "canceled"
  | "other";

export interface NflGameEvent {
  id: string;
  /** ISO-8601 UTC instant. */
  utc: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  state: NflGameState;
  /** Raw provider detail for states the widgets do not model exactly ("Q3 - 5:42"). */
  statusLabel: string | null;
  venue: string | null;
}

export interface NflScoreboardPayload {
  events: NflGameEvent[];
  asOf: string;
  source: "espn" | "none";
  /** True when the upstream feed failed — callers hide. */
  degraded: boolean;
}

/** The subset of the ESPN scoreboard event this module consumes. */
export interface EspnCompetitor {
  homeAway?: string | null;
  score?: string | number | null;
  team?: {
    abbreviation?: string | null;
    shortDisplayName?: string | null;
    displayName?: string | null;
  } | null;
}

export interface EspnRawEvent {
  id?: string | number | null;
  date?: string | null;
  status?: {
    type?: {
      state?: string | null;
      completed?: boolean | null;
      detail?: string | null;
      shortDetail?: string | null;
    } | null;
  } | null;
  competitions?: Array<{
    venue?: { fullName?: string | null } | null;
    competitors?: EspnCompetitor[] | null;
  }> | null;
}

function parseScore(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function teamLabel(competitor: EspnCompetitor | undefined): string | null {
  const team = competitor?.team;
  if (!team) return null;
  return team.shortDisplayName || team.abbreviation || team.displayName || null;
}

export function mapEspnStatus(
  state: string | null | undefined,
  completed: boolean | null | undefined,
  detail: string | null | undefined,
): NflGameState {
  if (state === "pre") return "scheduled";
  if (state === "in") {
    return /halftime/i.test(detail ?? "") ? "halftime" : "live";
  }
  if (state === "post") {
    if (completed) return "final";
    if (/postponed/i.test(detail ?? "")) return "postponed";
    if (/cancel/i.test(detail ?? "")) return "canceled";
    return "final";
  }
  return "other";
}

export function espnEventToNflEvent(event: EspnRawEvent): NflGameEvent | null {
  const id = event.id != null ? String(event.id) : null;
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((c) => c.homeAway === "home");
  const away = competition?.competitors?.find((c) => c.homeAway === "away");
  if (!id || !event.date || !home || !away) return null;
  const type = event.status?.type;
  const detail = type?.shortDetail ?? type?.detail ?? null;
  return {
    id,
    utc: event.date,
    home: teamLabel(home) ?? "Home",
    away: teamLabel(away) ?? "Away",
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    state: mapEspnStatus(type?.state, type?.completed, type?.detail),
    statusLabel: detail,
    venue: competition?.venue?.fullName ?? null,
  };
}

/** Map + dedupe across the fetched days (ESPN can repeat an event on
 * border-of-window days); sorted oldest-first for stable rendering. */
export function mapEspnScoreboard(events: readonly EspnRawEvent[]): NflGameEvent[] {
  const byId = new Map<string, NflGameEvent>();
  for (const event of events) {
    const mapped = espnEventToNflEvent(event);
    if (mapped) byId.set(mapped.id, mapped);
  }
  return [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc) || a.id.localeCompare(b.id));
}

/** The scoreboard days worth polling, in US Eastern game dates. ESPN indexes
 * a game by its ET calendar day (a 8:15pm ET kickoff is 00:15Z the next day
 * but is served under its ET day), so the window must be ET-local or evening
 * games fall out. Span is two days back through one ahead: NFL weeks run
 * Thursday→Monday, so on a Saturday that covers Thursday/Friday finals,
 * anything in progress, and the Sunday slate. */
export function scoreboardWindowDays(now: Date): string[] {
  const etDay = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date).replaceAll("-", "");
  const today = etDay(now);
  const [y, m, d] = [Number(today.slice(0, 4)), Number(today.slice(4, 6)), Number(today.slice(6, 8))];
  const etNoonThisMonth = Date.UTC(y, m - 1, d, 12);
  return [-2, -1, 0, 1].map((offset) => {
    const shifted = new Date(etNoonThisMonth + offset * 86_400_000);
    return etDay(shifted);
  });
}
