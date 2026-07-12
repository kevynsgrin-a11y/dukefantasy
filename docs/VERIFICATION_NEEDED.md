# VERIFICATION_NEEDED — live source confirmation before public launch

**Status as of 2026-07-12.** Phase 1 ran live verification via a 6-agent fan-out.
This build environment's egress proxy **403-blocks** three of the upstream hosts
at the CONNECT tunnel, so their endpoint shapes were confirmed from official docs
but could **not be live-captured here**. They are marked `status: "unverified"` in
`data/sources.json` and must be re-confirmed with a real call from the deploy
environment (Cloudflare) — which has open egress — **before the site is deployed
publicly with live data**. Until then the site runs on the frozen fixtures in
`fixtures/` (which are doc-accurate) and the triple-fallback covenant keeps it
honest.

## ✅ Verified live in this environment (reachable via raw.githubusercontent.com)

| Source | Result |
|---|---|
| nflverse `games.csv` (2026 schedule) | HTTP 200, **272 REG rows**, weeks 1–18. Byes + Week-1 date derived from data. `tos: open`. |
| nflverse `teams_colors_logos.csv` | HTTP 200, 32 teams (logos dropped). CC BY 4.0. `tos: open`. |
| WeatherData `stadium_coordinates.csv` | HTTP 200, all 32 current stadiums matched. `tos: open`. |

### Data-derived correction to the brief
The mission assumed **Thursday Sep 10, 2026** as kickoff. The nflverse schedule
shows the **first Week-1 game is Wednesday Sep 9, 2026, 20:20 ET (NE @ SEA)**; the
Thursday Sep 10 game is the international opener (SF @ LAR, Melbourne). The engine
anchors the season to the **first actual game** and surfaces both dates. The
countdown arithmetic golden (`2026-07-12 → 2026-09-10 = 60 days`) still passes as
a pure date-math check; the user-facing "days to gameday" uses the ET date (Sep 9
= 59 days). This is the "verify from data, don't trust me" covenant working.

## ⛔ Blocked here — RE-VERIFY LIVE FROM CLOUDFLARE BEFORE LAUNCH

Run these from the deploy environment (or any host with open egress) and confirm
HTTP 200 + the documented shape, then flip `status` to `"verified"` and refresh
`last_verified` in `data/sources.json`. Refreeze the fixtures from the live
payloads at the same time.

1. **Sleeper — `GET https://api.sleeper.app/v1/state/nfl`**
   - Confirm `{ season_type, week, season, season_start_date, display_week }`.
   - Confirm `season_start_date` (drives the countdown cross-check).
2. **Sleeper — `GET https://api.sleeper.app/v1/players/nfl`**
   - ~5MB object keyed by `player_id`. Confirm cross-ID fields (`espn_id`,
     `yahoo_id`, `rotowire_id`, `gsis_id`, `sportradar_id`) and D/ST entries
     (`player_id` == team code, `position` `"DEF"`).
   - **Politeness (already encoded):** fetch at most once/day via the scheduled
     edge job → KV; never client-direct; descriptive User-Agent.
   - Refreeze `fixtures/sleeper_players_sample.json` is optional (it is a curated
     matcher corpus) but capture a full snapshot into KV for production.
3. **Sleeper — `GET .../trending/add?lookback_hours=24&limit=25`** and `/drop`.
   - Confirm array of `{ player_id, count }`.
4. **FFC ADP — `GET https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026`**
   (and `half-ppr`, `standard`).
   - Confirm `{ meta: { type, teams, total_drafts, start_date, end_date }, players: [...] }`.
   - Confirm the **mandatory attribution** wording currently required and that
     `AffiliateSlot`/footer render `ADP data by Fantasy Football Calculator`.
5. **Open-Meteo — the forecast URL in the manifest** for one stadium (Denver).
   - Confirm hourly arrays (`time`, `windspeed_10m`, `windgusts_10m`,
     `precipitation`, `precipitation_probability`, `temperature_2m`, `weathercode`)
     and that `windspeed_unit=mph` / `temperature_unit=fahrenheit` are honored.
   - Confirm `timezone=GMT` returns UTC timestamps (the engine matches on UTC).

## Excluded from v1 (do not ship without owner approval)
- **Underdog ADP** — `restricted`. Only a personal, logged-in, desktop-only,
  rate-limited CSV exists; no republication right.
- **ESPN / Yahoo unofficial endpoints** — `restricted`. Undocumented, unlicensed
  for redistribution. Nominative text labels only ("ESPN ADP"), never logos.

## Deploy gate
`data/sources.json` must have **zero `unverified` rows among shipped feeds** and
every shipped feed `tos ∈ {open, permitted}` before the public deploy in Phase 6.
