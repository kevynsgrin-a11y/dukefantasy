/**
 * content-tools.js — the interactive tool pages. Each puts the working tool
 * above the fold and the explainer/methodology/FAQ below, mounts a per-tool ES
 * module, and cites its sources. Monetization: ad slots on explainer sections
 * only (never between a tool's inputs and result, never in the reveal flow);
 * compliance-gated affiliate slots on adult-intent pages only.
 */
import { add, toolHero, adSlot, affiliateSlot, sourcesBlock, SRC, explainer, faqBlock, crumbs } from './content.js';
import { SITE, ldWebApp } from './pages.js';

/* ---------------- FLAGSHIP: Draft Order Randomizer ---------------- */
add({
  path: '/draft-order-randomizer/', mode: 'draft',
  title: 'Draft Order Randomizer — provably fair',
  ogTitle: 'Provably-fair Fantasy Draft Order Randomizer',
  description: 'Randomize your fantasy draft order with provable fairness. We publish the seed’s hash before the reveal and the seed after, so anyone can verify the order. Suspense reveal for the group chat, weighted lottery for keepers, and a draft-party calendar invite.',
  jsonld: [ldWebApp('Draft Order Randomizer', 'Provably-fair fantasy draft order reveal with commit–reveal verification.', '/draft-order-randomizer/'),
    crumbs([['Draft Order Randomizer', '/draft-order-randomizer/']])],
  module: '/app/pages/randomizer.js',
  body: toolHero({
    eyebrow: 'The Flagship · commit → reveal → verify',
    h1: 'Draft Order Randomizer',
    sub: 'Add your teams, lock in the commitment, reveal the order, and share a link the whole league can verify. No login. No server keeps your league — the link is the record.',
    mount: `<div id="randomizer-app" class="stack" data-permalink-base="${SITE.origin}/verify/">
      <noscript><p class="notice">This tool needs JavaScript to generate cryptographic randomness in your browser. The <a href="/methodology/#commit-reveal">methodology</a> explains exactly how it works.</p></noscript>
    </div>`,
  }) + explainer(`
    <h2>How the fairness works (in plain language)</h2>
    <p>When you set up a reveal, your browser generates a random <strong>seed</strong> using the operating system’s cryptographic random generator. We immediately show you <strong>SHA-256(seed)</strong> — a fingerprint of that seed called the <em>commitment</em>. Share the commitment in your group chat <em>before</em> you reveal. Because the fingerprint can’t be run backwards, and because you’ve published it, you can’t re-roll after seeing the result. Then we reveal the order and hand over the seed. Anyone can drop the seed and your team list into <a href="/verify/">the verifier</a> and reproduce the exact same order — and confirm the seed matches the commitment you posted.</p>
    <p class="muted small">Honest limit: commit–reveal proves the order was fixed before the reveal and produced by this algorithm from this seed. It can’t prove a commissioner didn’t generate several seeds before committing — which is why we generate the seed with a cryptographic RNG and commit to it immediately. We’d rather tell you the limit than oversell it.</p>
    <h3>Reveal modes</h3>
    <ul>
      <li><strong>Instant</strong> — the full board at once.</li>
      <li><strong>Suspense</strong> — one pick at a time, built for the living-room TV and the group chat. Same order, revealed slowly (last pick first, by default).</li>
      <li><strong>Weighted lottery</strong> — NBA-style odds for keeper and dynasty leagues. <a href="/draft-lottery/">Set it up here →</a></li>
    </ul>
    <div class="card"><h3 style="margin-top:0">Draft Party Kit <span class="badge">coming soon</span></h3>
      <p class="muted small">A printable draft board, name cards, ceremony scripts, and custom reveal themes — plus an ad-free commissioner mode. The reveal link already looks great in a group chat; the Kit makes draft night an event. <a href="/updates/">Get notified.</a></p>
    </div>
    ${faqBlock([
      ['How do you randomize draft order fairly?', 'We use a commit–reveal scheme: publish SHA-256(seed) before the reveal, reveal the order, then publish the seed. The order is a deterministic Fisher–Yates shuffle seeded by that value, so anyone can reproduce and verify it.'],
      ['Can everyone in my league check it?', 'Yes. Share the result link. It carries the team list, mode, and seed. Your league-mates open <a href="/verify/">the verifier</a>, which re-derives the order and confirms the commitment.'],
      ['Do you store my league?', 'No. There are no accounts and nothing is saved on our servers. The share link encodes everything needed to reproduce the result.'],
    ])}
    ${sourcesBlock([{ label: 'Randomness: your browser’s Web Crypto (crypto.getRandomValues)' }, { label: 'Method: documented on our /methodology/ page', url: undefined }])}
  `),
});

/* ---------------- Weighted Draft Lottery ---------------- */
add({
  path: '/draft-lottery/', mode: 'draft',
  title: 'Weighted Draft Lottery — keeper & dynasty odds',
  description: 'Run a provably-fair weighted draft lottery for keeper and dynasty leagues. Set NBA-style odds from last year’s standings, publish the odds table and commitment before the draw, and let everyone verify it.',
  jsonld: [ldWebApp('Weighted Draft Lottery', 'Provably-fair weighted draft lottery with published odds and commit–reveal verification.', '/draft-lottery/'),
    crumbs([['Weighted Draft Lottery', '/draft-lottery/']])],
  module: '/app/pages/lottery.js',
  body: toolHero({
    eyebrow: 'Keeper & dynasty · odds published up front',
    h1: 'Weighted Draft Lottery',
    sub: 'Give worse records better odds, NBA-style. We compute the exact odds table, show it before the draw, fold it into the commitment, then run the provably-fair draw.',
    mount: `<div id="lottery-app" class="stack" data-permalink-base="${SITE.origin}/verify/"></div>`,
  }) + explainer(`
    <h2>How the weighted draw works</h2>
    <p>Each team gets a weight. The team drawn first is chosen with probability equal to its weight over the total; then it’s removed and the next pick is drawn the same way. We compute the <strong>exact</strong> odds of every team landing every slot (not a simulation) and display them before the draw. The draw itself is seeded and reproducible, so the <a href="/verify/">verifier</a> confirms it. Presets range from a gentle linear tilt to a steep worst-team-friendly curve — or paste your own weights.</p>
    ${faqBlock([
      ['Where do the odds come from?', 'You choose: last year’s standings (worst record → best odds) with a preset curve, or custom weights. The exact per-slot odds are computed and shown before the draw.'],
      ['Is the lottery verifiable too?', 'Yes — same commit–reveal scheme as the standard reveal. The weights are part of the shareable record, so changing them breaks verification.'],
    ])}
    ${sourcesBlock([{ label: 'Method: /methodology/#lottery' }])}
  `),
});

/* ---------------- Verify ---------------- */
add({
  path: '/verify/',
  title: 'Verify a Draft Order — check the fairness yourself',
  description: 'Paste a DukeFantasy draft-order link (or a seed + team list) and we’ll reproduce the exact order and confirm it matches the published commitment. Trust, but verify.',
  jsonld: [ldWebApp('Draft Order Verifier', 'Independently reproduce and verify a commit–reveal draft order.', '/verify/'),
    crumbs([['Verify', '/verify/']])],
  module: '/app/pages/verify.js',
  body: toolHero({
    eyebrow: 'Trust, but verify',
    h1: 'Verify a draft order',
    sub: 'Paste a result link, or enter the team list and seed by hand. We re-run the exact same math in your browser and tell you whether it checks out — and whether the seed matches the commitment.',
    mount: `<div id="verify-app" class="stack"></div>`,
  }) + explainer(`
    <h2>What “verified” means here</h2>
    <p>Two independent checks: (1) we hash the seed and compare it to the published commitment — if someone swapped the seed after committing, this fails loudly; (2) we re-derive the draft order from the seed and team list and compare it to the published order — if the teams, mode, weights, or order were altered, this fails too. Both run entirely in your browser. Nothing is sent anywhere.</p>
    ${faqBlock([
      ['I didn’t get a link, just a seed. Can I still verify?', 'Yes. Enter your team names in the exact order they were entered, paste the seed, and pick the mode. We’ll reproduce the order.'],
      ['It says the order doesn’t match — what happened?', 'Either the team list/order differs from what was used, or the run was altered. Double-check the team names and order first; small differences (a renamed team) change the result by design.'],
    ])}
    ${sourcesBlock([{ label: 'Method: /methodology/#commit-reveal' }])}
  `),
});

/* ---------------- Snake Pick Calculator ---------------- */
add({
  path: '/snake-draft-pick-calculator/', mode: 'draft',
  title: 'Snake Draft Pick Calculator (2026)',
  description: 'Find your exact pick numbers in a snake draft for any league size and draft slot — all rounds. Supports standard snake and third-round reversal (3RR). Free, instant, no login.',
  jsonld: [ldWebApp('Snake Draft Pick Calculator', 'Compute exact snake-draft pick numbers for any slot, league size, and rounds; supports third-round reversal.', '/snake-draft-pick-calculator/'),
    crumbs([['Snake Pick Calculator', '/snake-draft-pick-calculator/']])],
  module: '/app/pages/snake.js',
  body: toolHero({
    eyebrow: 'Draft math · arithmetic only',
    h1: 'Snake draft pick calculator',
    sub: 'Pick your league size and draft slot and get every pick you own, round by round. Toggle third-round reversal for leagues that use it.',
    mount: `<div id="snake-app" class="stack"></div>`,
  }) + explainer(`
    <h2>When do I pick in a snake draft?</h2>
    <p>In a snake (serpentine) draft the order reverses every round: if you pick 3rd in round 1, you pick 3rd-from-last in round 2, 3rd in round 3, and so on. In a 12-team league from the 7 slot you’re on the clock at picks 7, 18, 31, 42, 55, 66, 79, 90… — a steady ~11–13 picks between turns. Middle slots get the smoothest cadence; the turn (slot 1 and slot 12) gets back-to-back picks at every reversal.</p>
    <h3>What is third-round reversal (3RR)?</h3>
    <p>Some leagues soften the first-overall advantage with 3RR: rounds 1–2 snake normally, then round 3 repeats round 2’s order (instead of flipping back). In a 12-team league the 1.01 owner’s round-3 pick moves from 25 to 36, and the last slot gains ground. Our calculator supports both — the numbers update instantly.</p>
    ${adSlot('snake-explainer-1')}
    ${faqBlock([
      ['Does this work for any league size?', 'Yes — 2 to 32 teams, any number of rounds, any draft slot.'],
      ['Is third-round reversal the same everywhere?', 'The common definition (used by ESPN and Sleeper) reverses round 3 to match round 2, then resumes normal snaking. That’s what we encode. Check your platform’s setting if unsure.'],
    ])}
    ${sourcesBlock([{ label: 'Pure arithmetic — no external data' }])}
  `),
});

/* ---------------- ADP Explorer (adult-intent) ---------------- */
add({
  path: '/adp/', mode: 'draft',
  title: 'ADP Explorer 2026 — real average draft position',
  description: 'Explore real 2026 fantasy football ADP by scoring format (PPR, half-PPR, standard) and league size, from live mock drafts. Every number is stamped with its source, date, and format. ADP data by Fantasy Football Calculator.',
  jsonld: [ldWebApp('ADP Explorer', 'Average Draft Position by scoring format and league size, from live mock drafts, with per-source deltas and market tiers.', '/adp/'),
    crumbs([['ADP', '/adp/']])],
  module: '/app/pages/adp.js',
  body: toolHero({
    eyebrow: 'Market data · sourced & stamped',
    h1: 'ADP Explorer',
    sub: 'Where players actually go in real drafts — by scoring format and league size. Not a ranking, not a projection. Pick a format; the board updates with a data-as-of stamp.',
    mount: `<div id="adp-app" class="stack"></div>`,
  }) + explainer(`
    <h2>What ADP is (and isn’t)</h2>
    <p>Average Draft Position is the mean spot a player is drafted across many real drafts. It’s a <strong>market signal</strong> — the crowd’s revealed behavior — not an expert’s opinion of who’s better. We never blend scoring formats into one number: a full-PPR ADP and a standard ADP are different measurements, and we label every series with its format and league size.</p>
    <h3>Is ADP different on ESPN and Sleeper?</h3>
    <p>Yes — ADP varies by platform, scoring, and league size because different pools draft differently. Our data comes from Fantasy Football Calculator’s public mock drafts; when we can add more permitted sources, you’ll see per-source deltas side-by-side on the <a href="/adp/compare/">compare view</a>. We only ever compare like formats.</p>
    ${adSlot('adp-explainer-1')}
    ${affiliateSlot('dfs-adp-1', 'Best-ball & DFS partners', 'Drafting best ball? Partner offers will appear here once live — always with the disclosures below.')}
    ${faqBlock([
      ['How fresh is this ADP?', 'It refreshes daily from live mock drafts. Every board shows an “as of {date}, {n} drafts” stamp. If our feed lags, we show the last good copy with a staleness note rather than nothing.'],
      ['Why don’t you show rankings or projections?', 'That treadmill is owned by others and it’s all opinion. We stick to market data you can source and check. See our <a href="/methodology/">methodology</a>.'],
    ])}
    ${sourcesBlock([SRC.ffc])}
  `),
  adultIntent: true,
});

/* ---------------- ADP Compare (adult-intent) ---------------- */
add({
  path: '/adp/compare/', mode: 'draft',
  title: 'ADP Compare — per-format & per-source deltas',
  description: 'Compare fantasy ADP across scoring formats and sources side by side. See exactly how many picks later a player goes in standard vs. PPR — plainly framed, both formats labeled.',
  jsonld: [ldWebApp('ADP Compare', 'Side-by-side ADP delta view across formats and sources.', '/adp/compare/'),
    crumbs([['ADP', '/adp/'], ['Compare', '/adp/compare/']])],
  module: '/app/pages/adp-compare.js',
  body: toolHero({
    eyebrow: 'Side-by-side · both formats labeled',
    h1: 'ADP compare',
    sub: 'Put two ADP series next to each other and see the deltas: “goes 6 picks later in Standard than Full PPR.” We only compare like league sizes, and we always show both formats.',
    mount: `<div id="adp-compare-app" class="stack"></div>`,
  }) + explainer(`
    <h2>Reading the deltas</h2>
    <p>A positive delta means a player goes <em>later</em> in the second format. Pass-catching backs and target hogs slide in standard scoring; grinders and goal-line backs climb. The framing is plain-English on purpose — no jargon, no “tiers of the week,” just what the market does across formats.</p>
    ${adSlot('adp-compare-explainer-1')}
    ${affiliateSlot('dfs-compare-1', 'Best-ball & DFS partners')}
    ${sourcesBlock([SRC.ffc])}
  `),
  adultIntent: true,
});

/* ---------------- Market Tiers ---------------- */
add({
  path: '/tiers/', mode: 'draft',
  title: 'Market Tiers — deterministic ADP tier breaks',
  description: 'Market tiers built from ADP gaps with a documented, deterministic algorithm. These are market behavior — where the crowd draws lines — not expert opinion. Pick a format and see the breaks.',
  jsonld: [ldWebApp('Market Tiers', 'Deterministic tier clustering over ADP values, labeled as market behavior.', '/tiers/'),
    crumbs([['Market Tiers', '/tiers/']])],
  module: '/app/pages/tiers.js',
  body: toolHero({
    eyebrow: 'Market behavior · deterministic',
    h1: 'Market tiers',
    sub: 'Where does the market draw its lines? We cluster ADP by the gaps between players — a documented, repeatable algorithm. Same data in, same tiers out. This is crowd behavior, not our opinion.',
    mount: `<div id="tiers-app" class="stack"></div>`,
  }) + explainer(`
    <h2>How the tiers are built</h2>
    <p>We sort players by ADP and start a new tier wherever the gap to the next player is unusually large — specifically, more than a set multiple of the typical gap. It’s deterministic: run it twice on the same data and you get the same tiers. We call them <strong>market tiers</strong> because they describe where the crowd’s behavior clusters, not who we think is better. Full details on the <a href="/methodology/#tiers">methodology page</a>.</p>
    ${adSlot('tiers-explainer-1')}
    ${sourcesBlock([SRC.ffc])}
  `),
});

/* ---------------- Bye Weeks ---------------- */
add({
  path: '/bye-weeks-2026/', mode: 'draft',
  title: 'NFL Bye Weeks 2026 + roster conflict checker',
  description: 'The full 2026 NFL bye-week grid, verified from the nflverse schedule, plus a roster conflict checker: paste your teams and see which weeks stack up byes. Free, no login.',
  jsonld: [ldWebApp('Bye Weeks 2026', '2026 NFL bye-week grid and a roster bye-conflict checker.', '/bye-weeks-2026/'),
    crumbs([['Bye Weeks 2026', '/bye-weeks-2026/']])],
  module: '/app/pages/byes.js',
  body: toolHero({
    eyebrow: 'Verified from the schedule',
    h1: 'NFL bye weeks 2026',
    sub: 'The bye grid for all 32 teams, straight from the schedule data — plus a conflict checker: add your players and we’ll flag the weeks where too many are off at once.',
    mount: `<div id="byes-app" class="stack"></div>`,
  }) + explainer(`
    <h2>What week is my team’s bye in 2026?</h2>
    <p>Byes run from Week 5 through Week 14 in 2026. Pick your team in the grid above, or drop your whole roster into the conflict checker to see your danger weeks before you draft two players who rest on the same Sunday. Everything here is derived directly from the nflverse schedule release — not typed by hand.</p>
    ${adSlot('byes-explainer-1')}
    ${sourcesBlock([SRC.nflverse])}
  `),
});

/* ---------------- Cheat Sheet Builder ---------------- */
add({
  path: '/cheat-sheet/', mode: 'draft',
  title: 'Cheat Sheet Builder — ADP baseline, drag to adjust',
  description: 'Build a printable draft cheat sheet from a real ADP baseline. Drag to reorder, cross off as you go, save to your browser, and print. No login, no account.',
  jsonld: [ldWebApp('Cheat Sheet Builder', 'Build, reorder, save, and print a draft cheat sheet from an ADP baseline.', '/cheat-sheet/'),
    crumbs([['Cheat Sheet Builder', '/cheat-sheet/']])],
  module: '/app/pages/cheatsheet.js',
  body: toolHero({
    eyebrow: 'Your board, your order',
    h1: 'Cheat sheet builder',
    sub: 'Start from a real ADP baseline, drag players to match your read, cross them off during the draft, and print it. It saves to your browser — no login, nothing on our servers.',
    mount: `<div id="cheatsheet-app" class="stack"></div>`,
  }) + explainer(`
    <h2>How it works</h2>
    <p>We seed your sheet with an ADP baseline (a market starting point, not our ranking). Reorder freely — your changes are yours. Save keeps it in this browser via local storage; Print gives you a clean, ink-friendly page for draft night. Because there’s no login, clearing your browser data clears your sheet, so print or export before the big day.</p>
    ${adSlot('cheatsheet-explainer-1')}
    ${sourcesBlock([SRC.ffc])}
  `),
});

/* ---------------- Auction Budget Calculator ---------------- */
add({
  path: '/auction-budget-calculator/', mode: 'draft',
  title: 'Auction Budget Calculator — split your cap',
  description: 'Split your fantasy auction budget across roster slots by strategy (balanced, stars-and-scrubs, robust RB, and more). Arithmetic only, no projections. Free and instant.',
  jsonld: [ldWebApp('Auction Budget Calculator', 'Allocate an auction budget across roster slots by strategy preset.', '/auction-budget-calculator/'),
    crumbs([['Auction Budget Calculator', '/auction-budget-calculator/']])],
  module: '/app/pages/auction.js',
  body: toolHero({
    eyebrow: 'A spending framework · not projections',
    h1: 'Auction budget calculator',
    sub: 'Set your budget and roster, pick a strategy, and get a per-slot spending plan that sums exactly to your cap. It’s a framework for how to allocate — never a claim about player value.',
    mount: `<div id="auction-app" class="stack"></div>`,
  }) + explainer(`
    <h2>How to use it</h2>
    <p>Choose a preset — balanced, stars-and-scrubs, robust RB, hero RB, or even — and we split your cap across the roster slots you set, guaranteeing at least $1 per spot and an exact total. It’s deliberately opinion-free: think of it as a budgeting envelope system, not a prediction of who’ll score points.</p>
    ${adSlot('auction-explainer-1')}
    ${sourcesBlock([{ label: 'Pure arithmetic — no external data' }])}
  `),
});

/* ---------------- League Name Generator (NO affiliate — party-facing) ---------------- */
add({
  path: '/league-name-generator/', mode: 'draft',
  title: 'Fantasy League Name Generator',
  description: 'Generate fantasy football league names — clever, clean, and copy-ready. Free, instant, no login. Because the league needs a name before it needs a draft.',
  jsonld: [ldWebApp('League Name Generator', 'Generate fantasy football league names.', '/league-name-generator/'),
    crumbs([['League Name Generator', '/league-name-generator/']])],
  module: '/app/pages/namegen.js',
  body: toolHero({
    eyebrow: 'Every league needs one',
    h1: 'League name generator',
    sub: 'Hit the button until something sticks. Clean by default, copy-ready, no login. (No sportsbook ads here — this one’s for the group chat.)',
    mount: `<div id="namegen-app" class="stack"></div>`,
  }) + explainer(`
    <h2>Name your league in one click</h2>
    <p>Generate as many as you like and copy your favorite. This page stays clean of gambling promos on purpose — it’s a party page, and the ceremony stays classy.</p>
    ${sourcesBlock([{ label: 'Generated locally in your browser' }])}
  `),
});

/* ---------------- Draft Countdown ---------------- */
add({
  path: '/draft-countdown/', mode: 'draft',
  title: 'Fantasy Draft Countdown + calendar invite',
  description: 'Count down to your fantasy draft or NFL kickoff and add it to your calendar with one click (.ics). Kickoff is verified from the 2026 nflverse schedule.',
  jsonld: [ldWebApp('Draft Countdown', 'Countdown to a draft or kickoff with a one-click calendar invite.', '/draft-countdown/'),
    crumbs([['Draft Countdown', '/draft-countdown/']])],
  module: '/app/pages/countdown.js',
  body: toolHero({
    eyebrow: `Kickoff ${SITE.kickoffLabel}`,
    h1: 'Draft countdown',
    sub: 'Set your draft date and time, watch the clock, and drop it straight into your calendar. Or just count down to kickoff — verified from the real schedule.',
    mount: `<div id="countdown-app" class="stack" data-kickoff="${SITE.kickoffISO}" data-kickoff-label="${SITE.kickoffLabel}"></div>`,
  }) + explainer(`
    <h2>Kickoff, from the data</h2>
    <p>Our kickoff anchor comes straight from the nflverse schedule. The first game of the ${SITE.season} season is <strong>${SITE.kickoffLabel}</strong> (the marquee Thursday game is the international opener the next night). Set your own draft date above and grab a calendar invite for the whole league.</p>
    ${adSlot('countdown-explainer-1')}
    ${sourcesBlock([SRC.nflverse])}
  `),
});

/* ---------------- Weather Board (in-season, adult-intent) ---------------- */
add({
  path: '/weather/', mode: 'in-season',
  title: 'NFL Weather Board — wind, precip, cold at kickoff',
  description: 'A descriptive NFL weather board: wind, precipitation, and temperature at kickoff for outdoor games, inside the reliable forecast window. Conditions and general effects only — no start/sit advice. Weather data by Open-Meteo.',
  jsonld: [ldWebApp('NFL Weather Board', 'Kickoff weather flags for NFL games — descriptive, within the reliable forecast window.', '/weather/'),
    crumbs([['Weather Board', '/weather/']])],
  module: '/app/pages/weather.js',
  body: toolHero({
    eyebrow: 'In-season · descriptive only',
    h1: 'NFL weather board',
    sub: 'Wind, precipitation, and temperature at kickoff for this week’s outdoor games — inside the 7-day reliable window, stamped with fetch time and confidence. Domes are marked no-impact. We describe conditions; we don’t grade your lineup.',
    mount: `<div id="weather-app" class="stack"></div>`,
  }) + explainer(`
    <h2>How to read the board</h2>
    <p>We flag wind at 15 mph and up (escalating past 20), meaningful precipitation chances, and temperature extremes. Domes and closed roofs are marked no-impact. We only render games inside the ~7-day window where forecasts are reliable, we label how far out each one is, and we stamp the fetch time. What we <em>won’t</em> do is tell you to bench your kicker — that’s punditry, and it’s not our lane. Late-season games carry a winter-weather context note tied to the <a href="https://nino34.example" rel="nofollow">Nino34</a> southern-storm-track angle.</p>
    ${adSlot('weather-explainer-1')}
    ${affiliateSlot('dfs-weather-1', 'DFS & sportsbook partners', 'Weather moves totals. Partner offers will appear here once live — with the disclosures below.')}
    ${sourcesBlock([SRC.openmeteo, SRC.nflverse])}
  `),
  adultIntent: true,
});

/* ---------------- Waiver Radar (in-season, adult-intent) ---------------- */
add({
  path: '/waiver-radar/', mode: 'in-season',
  title: 'Waiver Radar — most-added players (Sleeper trending)',
  description: 'The waiver radar: the most-added and most-dropped players across Sleeper leagues in the last 24 hours, by position, with a data-as-of stamp. Descriptive market movement, not start/sit advice.',
  jsonld: [ldWebApp('Waiver Radar', 'Most-added/dropped players from Sleeper trending data, joined to a canonical registry.', '/waiver-radar/'),
    crumbs([['Waiver Radar', '/waiver-radar/']])],
  module: '/app/pages/waiver.js',
  body: toolHero({
    eyebrow: 'In-season · market movement',
    h1: 'Waiver radar',
    sub: 'Who the market is grabbing right now — the most-added players across Sleeper leagues in the last 24 hours, filterable by position, stamped with the time. It’s what’s happening, not what you should do.',
    mount: `<div id="waiver-app" class="stack"></div>`,
  }) + explainer(`
    <h2>What the radar shows</h2>
    <p>These are transaction counts across Sleeper leagues — pure market movement. A player near the top is being added a lot; that’s a signal, not a command. We join Sleeper’s trending feed to a canonical player registry so names, teams, and positions are correct, and we surface anything we can’t resolve rather than dropping it.</p>
    ${adSlot('waiver-explainer-1')}
    ${affiliateSlot('dfs-waiver-1', 'DFS & sportsbook partners')}
    ${sourcesBlock([SRC.sleeper])}
  `),
  adultIntent: true,
});
