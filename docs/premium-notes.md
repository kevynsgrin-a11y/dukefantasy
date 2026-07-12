# Premium Notes — "Draft Party Kit" (DO NOT BUILD YET)

A feature-flagged teaser only. This documents the concept, the funnel, and the
market proof so it's ready when the flagship has traction. The reveal
permalink's OG footprint is the funnel: every league that runs a reveal
broadcasts the link to ~12 people; the Kit is the natural upsell for the
commissioner who wants draft night to be an event.

## The product concept — "Draft Party Kit"

A one-time or seasonal purchase, sold to commissioners:
- **Printable draft board** — big-wall poster with the reveal's order, team
  name cards, and pick slots to fill in live.
- **Name cards / table tents** — one per team, matching the board.
- **Ceremony scripts** — a short "draft night MC" script + reveal countdown bits.
- **Custom reveal themes** — premium `RevealStage` skins (broadcast lower-thirds,
  team-color theming, sound packs) layered on the existing state machine.
- **Ad-free Commissioner Mode** — the whole site, no display ads, for the person
  running the league.
- **Draft-party .ics++** — richer invite with the board link + agenda.

Everything reuses engines that already exist (`runRitual`, `draftPartyIcs`,
`RevealStage` state machine). The Kit is presentation + print assets + a flag —
no new data, no new engine.

## Funnel

1. A commissioner runs the free reveal → shares the verify permalink to ~12
   league-mates. Each open is a branded impression with great OG.
2. The result page + the verify page tease the Kit ("Make draft night an event
   — Draft Party Kit").
3. Feature flag `PREMIUM_ENABLED` gates a checkout stub. Until enabled, the
   teaser links to `/updates/` email capture.

## Market proof (why premium works in this vertical)
- **FantasyPros** — freemium tiers, expert cheat sheets behind a wall; proven
  willingness to pay for draft tooling.
- **Draft Sharks** — paid memberships for draft analysis.
- **The Fantasy Footballers** — a club/membership model around draft-season
  content and a community.
- Independent single-tool sites (KeepTradeCut) monetize a beloved tool at scale.

Our differentiator: our free tool *broadcasts itself to a whole league* on draft
night, and the paid Kit sells the ceremony we already own — not another
projections treadmill.

## Implementation sketch (when greenlit)
- `PREMIUM_ENABLED` env flag; `AffiliateSlot`-style `PremiumTeaser` component.
- Checkout via a hosted provider (Stripe Checkout link) — no card data on us.
- Print assets generated from the run JSON (board = HTML → print CSS → PDF).
- Commissioner Mode = a signed cookie that suppresses `AdSlot`/`AffiliateSlot`.

## Guardrails
- The free reveal stays fully functional and ad-free forever — the ceremony is
  the brand, and gating it would poison the funnel.
- No gambling content anywhere near the party pages or the Kit.
