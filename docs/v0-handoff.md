# v0 Handoff — the skin drops in without touching the engines

DukeFantasy is built so a v0 (or any designer) can replace **markup and styles
only** and bind to the engine JSON **verbatim**. The engines are pure ES modules
with zero DOM coupling; the frontend is a thin binding layer. This document is
the contract.

**Aesthetic north star for v0:** *draft-night broadcast graphics — big-board
energy.* The full creative brief is the owner's to write; this is the technical
contract v0 must not break.

**The one hard rule:** v0 replaces the DOM/CSS in `public/app/pages/*.js` and the
styles in `brand.css`. It binds to the engine functions below and their return
shapes exactly. It must not change `src/engine/**` or the shape of what those
functions return. The reveal theatrics (animation, sound, broadcast layout) are
built on top of the `RevealStage` **state machine** documented below.

---

## 1. Engine public API (import from `/engine/…`)

All are pure. `runRitual`/`verifyRitual` are async (Web Crypto). Everything else
is synchronous.

| Function | Import | Signature → returns |
|---|---|---|
| `runRitual(config)` | `/engine/ritual.js` | `{leagueName,teamNames,mode,seed,commitment,runDigest,weights,odds,orderIndices,order,reveal,permalink,state}` |
| `verifyRitual(input, expected?)` | `/engine/ritual.js` | `{valid,commitmentValid,orderValid,recomputedOrder,recomputedCommitment,config,reasons}` |
| `computeLotteryOdds(weights)` | `/engine/ritual.js` | `{n,firstPick[],slotMatrix[][],exact}` |
| `draftPartyIcs(run, party)` | `/engine/ritual.js` | `.ics` string |
| `getSnakePicks(cfg)` | `/engine/draftmath.js` | `number[]` |
| `getSnakeBoard(cfg)` | `/engine/draftmath.js` | `{board:[[{overall,slot,round,reverse}]]}` |
| `splitAuctionBudget(cfg)` | `/engine/draftmath.js` | `{allocations:[{slot,amount}],total}` |
| `parseFfcAdp(json,ctx)` / `getAdp(view)` | `/engine/adp.js` | ADP series (see below) |
| `computeDeltas(a,b)` | `/engine/adp.js` | `{rows:[{name,adpA,adpB,delta,framing}]}` |
| `clusterTiers(series,opts)` | `/engine/adp.js` | `{tiers:[{tier,players,adpStart,adpEnd}]}` |
| `parseSchedule` / `getByeWeeks` / `getByeGrid` / `checkByeConflicts` / `getSeasonKickoff` / `getCountdown` | `/engine/schedule.js` | see below |
| `flagGame` / `buildWeatherBoard` | `/engine/gameweather.js` | weather card(s) |
| `buildTrendingBoard(trending,registry,opts)` | `/engine/trending.js` | `{rows,headline,disclaimer,asOf}` |
| `getSeasonMode(state,opts)` | `/engine/seasonmode.js` | `{mode,reason}` |
| `buildRegistry(players)` / `matchPlayer` | `/engine/identity.js` | registry / `{matched,playerId,method,confidence,candidates}` |

### Sample payload — a reveal run (`runRitual`)
```json
{
  "leagueName": "The League",
  "teamNames": ["Team Alpha","…","Team Lima"],
  "mode": "suspense",
  "seed": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "commitment": "5f2e…(64 hex)",
  "runDigest": "9ab1…(64 hex)",
  "weights": null,
  "odds": null,
  "orderIndices": [0,11,1,…],
  "order": ["Team Alpha","Team Lima","Team Bravo","…"],
  "reveal": { "direction": "last-to-first",
    "steps": [ {"pick":12,"index":11,"team":"…"}, {"pick":11,…}, … ] },
  "permalink": "eyJ2Ijox…(base64url)",
  "state": "complete"
}
```

### Sample payload — an ADP view (`parseFfcAdp` → series)
```json
{
  "source": "ffc", "sourceLabel": "Fantasy Football Calculator",
  "attribution": "ADP data by Fantasy Football Calculator",
  "format": "ppr", "formatLabel": "Full PPR", "teams": 12, "year": 2026,
  "drafts": 412, "dateRange": {"start":"2026-06-15","end":"2026-07-12"},
  "fetchedAt": "2026-07-12",
  "players": [
    {"name":"Justin Jefferson","position":"WR","team":"MIN","adp":1.8,
     "adpFormatted":"1.02","timesDrafted":401,"high":1,"low":4,"stdev":0.7,"bye":6}
  ]
}
```

### Other quick shapes
- `getByeWeeks(schedule)` → `{ "KC": 5, "SF": 8, "PHI": 10, … }`
- `checkByeConflicts` → `{ conflicts:[{week,count,players}], worstWeek }`
- `getCountdown(now,target)` → `{ days, hours, minutes, seconds, past }`
- `flagGame(...)` → `{ impact:"significant", flags:[{type:"wind",severity:"alert",detail}], dome:false, confidence:"high", asOf }`
- `buildTrendingBoard(...)` → `{ headline, disclaimer, asOf, rows:[{name,position,team,count}] }`

---

## 2. Component inventory (the classes v0 restyles)

These are the render targets. v0 restyles the CSS classes and may rewrite the
DOM in the page modules, but the **inputs** (engine JSON) stay fixed.

| Component | Where | Bound to |
|---|---|---|
| `SeasonModeFrame` | `<html data-mode>` + hub | `getSeasonMode()` |
| `CountdownHero` | `.countdown` `.unit .n .l` | `getCountdown()` |
| `LeagueSetupForm` | randomizer/lottery setup | form → `runRitual` config |
| `CommitmentBadge` | `.commitment-badge` | `run.commitment` |
| `RevealStage` | `.reveal-stage .reveal-pick .reveal-slot` | `run.reveal.steps` (state machine §3) |
| `LotteryOddsTable` | table | `run.odds.firstPick` + weights |
| `VerifyPanel` | `.verify-result .verify-ok/.verify-bad` | `verifyRitual()` |
| `PickGrid` / `SnakeBoard` | tables/badges | `getSnakePicks` / `getSnakeBoard` |
| `AdpTable` | `.table-scroll table` | ADP series `players` |
| `DeltaBadge` | `.chip` | `computeDeltas().rows[].delta` |
| `TierBoard` | cards | `clusterTiers().tiers` |
| `ByeGrid` / `ConflictChecker` | table/form | schedule engine |
| `CheatSheetBuilder` | list | ADP baseline + localStorage |
| `AuctionSplitter` | table | `splitAuctionBudget` |
| `NameGenerator` | local | — |
| `WeatherCard` | `.chip-*` cards | `flagGame` |
| `TrendRow` | rows | `buildTrendingBoard().rows` |
| `StalenessStrip` | `.staleness-strip` | feed state |
| `DataAsOfStamp` | `.stamp` | `series` stamp / `asOf` |
| `SourcesBlock` | `.sources-block` | manifest attribution |
| `AdSlot` | `.ad-slot` (reserved height) | display ads |
| `AffiliateSlot` | `.affiliate-slot` + `.compliance-gate` | CPA (gated) |
| `RGFooter` | footer | static |
| `EmailCapture` | `.email-capture` | `/api/subscribe` |
| `FTCDisclosure` | `.ftc` | static |

Shared factories live in `public/app/ui.js` (`h`, `icon`, `DataAsOfStamp`,
`StalenessStrip`, `SourcesBlock`, `AdSlot`, `AffiliateSlot`, `CommitmentBadge`,
`EmailCapture`, `copyText`).

---

## 3. RevealStage state machine (theatrics build on THIS)

The reveal is a strict, documented state machine. v0 owns the animation, sound,
and broadcast layout — but must drive them off these states, not reinvent them.

```
 setup ──(runRitual)──> committed ──(user reveals)──> revealing[i] ──> complete
   │                        │                              │              │
   │  LeagueSetupForm       │  CommitmentBadge shown       │  reveal.steps │  order + seed
   │                        │  (share BEFORE revealing)    │  i = 0..n-1   │  + permalink + .ics
```

- **setup** — collect league, teams, mode. Nothing generated yet.
- **committed** — `runRitual` has produced `seed`, `commitment`, and the full
  `order`, but the UI shows ONLY the `commitment`. This is the shareable
  "locked" moment. (Weighted mode also shows `odds` here.)
- **revealing[i]** — walk `run.reveal.steps` (already ordered per
  `direction`). Each step is `{pick, index, team}` with the TRUE pick number.
  v0 animates step `i`; the data is fixed.
- **complete** — reveal `seed`, the `order` table, the `permalink`
  (`<verify-base>#r=<run.permalink>`), copy buttons, and the `.ics` invite.

Reference implementation: `public/app/pages/randomizer.js`.

---

## 4. Theme tokens (restyle in `brand.css`)

Override these CSS custom properties (defined in `theme.css`) to reskin without
touching markup. Full list in `theme.css :root`.

`--bg --surface --surface-2 --ink --ink-soft --ink-faint --line --line-strong
--brand --brand-ink --brand-soft --accent --accent-soft --ok --warn --danger
--sev-alert --sev-watch --sev-note --radius --radius-lg --shadow --shadow-lg
--space-1…8 --font-sans --font-mono --maxw --tap`

Light/dark are handled via `prefers-color-scheme` **and** a
`:root[data-theme="dark|light"]` override (the theme toggle stamps
`data-theme`). Style both.

---

## 5. Paste-ready v0 prompt stub

> Build a **draft-night broadcast** skin for DukeFantasy — big-board energy,
> ESPN-draft-desk graphics, bold tabular numbers, gold accents on field green.
> Reskin `brand.css` (override the theme tokens) and the DOM inside
> `public/app/pages/*.js`. **Do not** change `src/engine/**` or the JSON shapes
> in `docs/v0-handoff.md`. The centerpiece is `RevealStage`: drive its animation
> off the `setup → committed → revealing[i] → complete` state machine and the
> `run.reveal.steps` array — one dramatic card per pick, last pick first,
> confetti on pick #1, a shareable result card that looks great in a group chat.
> Keep the ceremony pages (reveal, lottery, name generator) free of ads. WCAG
> AA, mobile-first, honor `prefers-reduced-motion`. *(Full creative brief: TBD by
> owner.)*
