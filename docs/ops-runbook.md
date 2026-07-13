# Ops Runbook — DukeFantasy

Operational checklist keyed to the fantasy calendar. The site flips modes
automatically (see `src/engine/seasonmode.js`); this runbook covers the human +
infra work around it.

## Standing infrastructure

- **Hosting:** Cloudflare Pages, project `dukefantasy`, output dir `public/`.
- **Feeds:** browser → `/api/feed/<id>` edge Function → KV cache → upstream.
  Never client-direct. Descriptive User-Agent set via `FEED_USER_AGENT` var.
- **KV namespaces:** `DUKE_CACHE` (feeds + player-DB snapshot), `DUKE_SUBSCRIBERS`
  (email). Create with `wrangler kv namespace create …`, paste ids into
  `wrangler.toml`.
- **Daily Sleeper snapshot:** `workers/daily-snapshot.js`, deployed as a separate
  cron Worker (`crons: ["17 9 * * *"]`), bound to the same `DUKE_CACHE`. It pulls
  the ~5MB `/players/nfl` DB once/day (Sleeper's politeness rule) and warms
  trending/state. Verify it ran: `GET https://duke-daily-snapshot.<acct>.workers.dev/?token=<SNAPSHOT_TOKEN>`.

## Deploy

**Push-button (recommended):** the `Deploy to Cloudflare Pages` GitHub Action
(`.github/workflows/deploy.yml`, manual `workflow_dispatch`). A runner has open
egress, so it runs the live source-verification gate the dev container can't,
then deploys. Add repo secrets `CLOUDFLARE_API_TOKEN` (scope: Pages: Edit) and
`CLOUDFLARE_ACCOUNT_ID`, then Actions → Deploy → Run.

**Manual / local (needs open egress + Cloudflare auth):**
```
npm test                              # gate: all engine goldens green
node scripts/verify-sources.js --write  # live-verify feeds, refresh fixtures, flip sources.json
npm run build                         # copies engines+fixtures, generates HTML/sitemap/etc.
npx wrangler pages deploy public --project-name dukefantasy
```
Post-deploy once: attach custom domain `dukefantasy.com`, submit
`sitemap.xml` to Google Search Console, fill `ads.txt`, place cross-links to
Sports-Always / Nino34, and confirm the daily snapshot Worker + cron.

**Lighthouse gate (met):** desktop scores on the built site — `/` 100/100/96/100,
randomizer 100/100/100/100, `/adp/` 100/100/96/100 (perf/a11y/best-practices/seo).
Re-check with `npx lighthouse <url> --preset=desktop` against `npm run serve`.

## Pre-launch gate (blocking)
- [ ] `data/sources.json`: every SHIPPED feed `status: "verified"` and
      `tos ∈ {open, permitted}`. Run `node scripts/verify-sources.js --write`
      from an open-egress environment (or let the deploy Action do it) — it
      fetches each feed, validates its shape, refreshes fixtures, and flips the
      statuses. See `docs/VERIFICATION_NEEDED.md` for the manual checklist.
- [ ] `npm test` green; Lighthouse ≥ 95/95/95 on `/`, randomizer, `/adp/`.
- [ ] Commit–reveal loop e2e-verified on a fresh session (run → share → verify).
- [ ] Zero console errors; all internal links resolve; feed-outage renders a
      stamped last-good copy, never blank.

## Season calendar as a checklist

| When | Mode | Do |
|---|---|---|
| **Late July** | draft | Randomizer surge — confirm reveal + verify + share OG look great in a group chat. Ship the "Draft Week Checklist" lead magnet. |
| **August** | draft | Draft peak. Watch ADP freshness daily; FFC volume climbs. Publish/refresh strategy spokes. |
| **Labor Day wknd (Sep 5–7)** | draft | Peak drafting. Load-test the reveal. Newsjack "last-minute draft" queries. |
| **Kickoff (Wed Sep 9, 2026)** | draft → in-season | Confirm `getSeasonMode` flips at the first game (Sleeper state → `regular`). Weather board + waiver radar become the hero. |
| **Weekly Tue/Wed** | in-season | Waiver cadence: trending feed fresh, board healthy. |
| **Weekly Thu–Sun** | in-season | Weather board window correct (~7 days), fetch stamps current, domes flagged. |
| **December (playoff weeks)** | in-season | Weather weeks — Q4 eCPM peak. El Niño winter note live, Nino34 cross-link. |
| **Early January** | in-season → offseason | After championships, mode → offseason. Run the January decision memo below. |

## Weekly in-season pass (every Tue)
1. `/api/feed/sleeper_state_nfl` — correct week? Mode correct?
2. Waiver radar — trending resolving to names (check `stats.unresolved` low)?
3. Weather board — only ~7-day window rendered, stamps current, domes no-impact?
4. Snapshot Worker ran in the last 24h? KV `feed:sleeper_players_nfl` fresh?
5. Any feed stale strip showing on prod? Investigate upstream.

## January decision memo (template — fill before deciding)

**Decision:** hibernate honestly (offseason archive + email) vs. build a
dynasty-lite offseason layer (KTC-style trade values, rookie ADP, keeper tools).

Collect first:
- [ ] Traffic curve Sep→Jan; what % of peak is Jan organic?
- [ ] Which tools retained users in-season (analytics on randomizer vs. weather vs. waiver)?
- [ ] Email list size + open rate; would an offseason digest sustain it?
- [ ] Dynasty demand signal: search volume for "dynasty rookie adp", "keeper value 2027".
- [ ] Data availability: is a permitted dynasty/rookie ADP source live (FFC dynasty/rookie endpoints)?
- [ ] Effort vs. the next draft season's payoff (build once, reuse in July).

Default if signals are weak: **hibernate honestly** — offseason mode with a
retro, the email list warm, and a countdown to next season. Don't fake activity.
