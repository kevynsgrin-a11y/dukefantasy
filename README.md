# DukeFantasy

**Market data + fair tools. No hot takes.**

A static-first fantasy football draft HQ. We don't host leagues, publish
rankings/projections, or run a media portal. We own two things:

1. **The ceremony** — a *provably-fair* draft-order reveal (commit–reveal: we
   publish `SHA-256(seed)` before the reveal and the seed after, so anyone can
   re-verify the order), with suspense mode, a weighted keeper lottery, and a
   draft-party `.ics`.
2. **The utility belt** — snake pick calculator, ADP explorer with per-source
   deltas, market tiers, bye weeks + conflict checker, cheat sheet builder,
   auction budget, league name generator, draft countdown. In-season it pivots
   to a weather board + waiver radar automatically.

Built on **verified open data** only: Sleeper, Fantasy Football Calculator,
nflverse, Open-Meteo. Every number is sourced, stamped, and format-labeled.

## Architecture

```
src/engine/        pure ES-module engines (zero DOM), golden-tested
  ritual.js        FLAGSHIP: commit–reveal draft order + weighted lottery
  identity.js      Sleeper-based crosswalk + name matcher (D/ST, suffixes, ambiguity)
  adp.js           ADP series, deltas, deterministic market tiers, format guards
  draftmath.js     snake picks (+3RR), auction split, keeper cost
  schedule.js      2026 byes, kickoff (DST-aware ET→UTC), countdown, conflicts
  gameweather.js   descriptive kickoff weather flags (Open-Meteo)
  trending.js      Sleeper waiver radar
  seasonmode.js    draft / in-season / offseason auto-flip
  util/            rng, hash (Web Crypto), ics, base64, staleness, feed fallback
data/sources.json  the source manifest (tos classification per source)
fixtures/          frozen feeds (nflverse = real; others doc-shaped, see below)
functions/         Cloudflare Pages Functions: edge feed proxy + /api/subscribe
workers/           daily Sleeper player-DB snapshot (cron Worker)
public/            static site: theme.css, brand.css, app/ (runtime + tool modules)
scripts/           build + static-site generator (pages/sitemap/robots/…)
tests/             node --test golden suites (GV1–GV12)
docs/              v0-handoff, ops-runbook, newsjack-calendar, premium-notes, VERIFICATION_NEEDED
```

The engines are the product; the frontend is a thin binding layer. A v0 skin
drops in over `brand.css` + `public/app/pages/*.js` without touching engines —
see `docs/v0-handoff.md`.

## Develop

```
npm test          # engine goldens (GV1–GV12)
npm run build     # copy engines+fixtures into public/, generate the HTML site
npm run dev       # build + wrangler pages dev
```

## Deploy (Cloudflare Pages)

```
npm run build
npx wrangler pages deploy public --project-name dukefantasy
```

Create the KV namespaces (`DUKE_CACHE`, `DUKE_SUBSCRIBERS`) and paste their ids
into `wrangler.toml`, then deploy the cron snapshot Worker. Full steps + the
pre-launch gate are in `docs/ops-runbook.md`.

## Data verification status (important)

`nflverse` (schedule/teams/stadiums) is **live-verified**. Sleeper, FFC, and
Open-Meteo endpoint shapes were confirmed from official docs but their hosts are
egress-blocked in the build/CI environment, so they are marked `unverified` and
must be re-confirmed live from the deploy environment before public launch — see
`docs/VERIFICATION_NEEDED.md`. Until then the site runs on the frozen fixtures,
and the triple-fallback covenant keeps every tool honest.

## Honesty covenant

Every dataset carries an "as of {date}" stamp; feeds load edge → direct →
last-good so you never see a blank; scoring format + league size are first-class
labels (we refuse to blend formats into one consensus); market tiers and ADP are
labeled market behavior, never expert opinion. Not affiliated with the NFL or any
platform; team/platform names are used nominatively; no logos.
