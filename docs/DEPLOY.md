# DEPLOY — consolidation + go-live runbook

DukeFantasy is hosted on **Cloudflare Pages** from **this repo**
(`kevynsgrin-a11y/dukefantasy`). This is the single source of truth. A v0 export
once created a second repo (`dukefantasy-7z`) + a Vercel attempt; that path is
retired — see "Consolidation" below.

## Why Cloudflare Pages (not Vercel)
- `dukefantasy.com`'s DNS is already on Cloudflare (nameservers `*.ns.cloudflare.com`).
  A Cloudflare Pages custom domain in the same account attaches with **no manual
  DNS records** — the cleanest possible setup.
- This repo is Cloudflare-Pages-native: static site + Pages Functions
  (`/functions/api/*`) + KV + a cron Worker (`workers/daily-snapshot.js`). It runs
  as-is; nothing needs porting.
- `dukefantasy-7z` is a v0-generated UI shell (design only) — no engines, data
  layer, tests, or backend. Keep it as design reference for the future v0 skin.

## Current state at time of writing
- Domain registrar + authoritative DNS: **Cloudflare**.
- Apex `dukefantasy.com`: **no A/AAAA record** → not resolving yet (nothing to
  break; we bring it up cleanly once).
- Repo: `main` is fully built, 64/64 tests, e2e green, Lighthouse ≥95.

## Go-live steps (in order)

### 1. Cloudflare Pages project (Git integration — recommended)
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
`kevynsgrin-a11y/dukefantasy`.
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `public`
- Framework preset: **None**

Auto-deploys on every push to `main`, and auto-detects `/functions`.

*(Alternative: direct upload via the `Deploy to Cloudflare Pages` GitHub Action —
`workflow_dispatch`. Needs the two secrets in step 6. `npx wrangler pages deploy
public --project-name dukefantasy`.)*

### 2. Attach the domain (this is what makes it live)
Pages project → **Custom domains → Set up a custom domain** → add
`dukefantasy.com`, then `www.dukefantasy.com`. Same-account DNS means Cloudflare
creates + activates the records automatically. Live within a minute or two.

### 3. Retire the Vercel path
- Cloudflare → domain → **DNS**: delete any leftover Vercel record (`A` →
  `76.76.21.21`, or `CNAME` → `cname.vercel-dns.com`). Keep the Pages records from
  step 2.
- Vercel → remove `dukefantasy.com` from whatever project claims it (stops the
  "DNS misconfigured" warning).

### 4. Retire the duplicate repo
GitHub → `dukefantasy-7z` → **Settings → Archive** (reversible) or delete.

### 5. KV bindings (Functions get full power; not launch-blocking)
Create KV namespaces `DUKE_CACHE` and `DUKE_SUBSCRIBERS`; bind them in the Pages
project → **Settings → Functions → KV namespace bindings** under those exact
names. Without them the feed proxy falls back to bundled fixtures and
`/api/subscribe` no-ops gracefully.

Optional/in-season: `wrangler deploy` the cron `workers/daily-snapshot.js` for the
daily Sleeper player-DB snapshot.

### 6. Verify the live feeds (flip sources.json to verified)
From an open-egress environment (your machine, or the Cloudflare build):
```
node scripts/verify-sources.js --write   # live-checks FFC/Sleeper/Open-Meteo, refreshes fixtures
```
Commit the result. This is what clears the Phase-1 gate.

**Deploy Action secrets** (only if using the Action rather than Git integration):
GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret**:
- `CLOUDFLARE_API_TOKEN` — a token scoped to **Account → Cloudflare Pages: Edit**
  (create at Cloudflare → My Profile → API Tokens).
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard → any domain → Overview (right
  rail), or Workers & Pages → Account details.

Never paste these into code, chat, PRs, or issues — repo Actions secrets only.

## Result
One repo → one Cloudflare Pages project → domain attached at Cloudflare. No Vercel
records, no cross-platform drift.
