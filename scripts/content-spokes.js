/**
 * content-spokes.js — evergreen spokes, trust pages, and the legal set.
 * Non-punditry throughout. Content in full.
 */
import { add, sourcesBlock, SRC, crumbs, emailCapture } from './content.js';
import { SITE, ldFaq, esc } from './pages.js';

const page = (path, title, description, bodyInner, extra = {}) => add({
  path, title, description,
  jsonld: [crumbs([[title.replace(/ ·.*/, ''), path]]), ...(extra.jsonld || [])],
  mode: extra.mode,
  body: `<section class="section"><div class="wrap" style="max-width:760px"><div class="stack">${bodyInner}</div></div></section>`,
});

/* ---- Strategy basics (evergreen, non-punditry) ---- */
page('/draft-strategy-basics/',
  'Draft Strategy Basics — formats, snake vs. auction, what ADP is',
  'A plain, non-hype primer on fantasy draft basics: scoring formats, snake vs. auction, what ADP actually is, and how to prep. No hot takes — just how the machinery works.',
  `<h1>Draft strategy basics</h1>
  <p class="muted">No hot takes here — just how the machinery works, so you can make your own calls. For the numbers, use the <a href="/adp/">ADP explorer</a> and <a href="/tiers/">market tiers</a>.</p>
  <h2>Scoring formats, quickly</h2>
  <p><strong>Standard</strong> gives no points for catches; <strong>PPR</strong> (points per reception) rewards them fully; <strong>half-PPR</strong> splits the difference. This single setting reshuffles value: pass-catching backs and slot receivers rise in PPR and slide in standard. That’s why we never blend formats — a PPR ADP and a standard ADP are different measurements.</p>
  <h2>Snake vs. auction</h2>
  <p>In a <strong>snake</strong> draft, order reverses each round; your slot fixes your pick cadence (see the <a href="/snake-draft-pick-calculator/">pick calculator</a>). In an <strong>auction</strong>, everyone can bid on everyone — you get whoever you’re willing to pay for, within a budget (try the <a href="/auction-budget-calculator/">budget calculator</a>). Snake is simpler; auction gives more control at the cost of time and nerves.</p>
  <h2>What ADP is</h2>
  <p>Average Draft Position is where a player goes, on average, across real drafts. It’s a map of the market — useful for knowing when you’ll realistically have a shot at someone — not a ranking of who’s best. Pair it with your own read.</p>
  <h2>A five-minute prep</h2>
  <ul>
    <li>Know your <a href="/snake-draft-pick-calculator/">pick numbers</a> and the players likely there.</li>
    <li>Check your <a href="/bye-weeks-2026/">bye weeks</a> so you don’t stack rest days.</li>
    <li>Build a <a href="/cheat-sheet/">cheat sheet</a> from an ADP baseline and adjust to taste.</li>
    <li>Run the <a href="/draft-order-randomizer/">draft-order reveal</a> so the whole league trusts the order.</li>
  </ul>
  ${sourcesBlock([SRC.ffc, SRC.nflverse])}`,
  { mode: 'draft' });

/* ---- FAQ ---- */
const FAQ = [
  ['How do you randomize draft order fairly?', 'We use a commit–reveal scheme. Your browser generates a random seed and we publish SHA-256(seed) — the commitment — before revealing anything. The order is a deterministic Fisher–Yates shuffle seeded by that value. After the reveal we publish the seed, so anyone can reproduce the exact order and confirm it matches the commitment on our verify page.'],
  ['When do I pick in a 12-team snake draft?', 'It depends on your slot. From the 7 slot you pick 7, 18, 31, 42, 55, 66, 79, 90… Use the snake pick calculator for any slot and league size, including third-round reversal.'],
  ['What week is my team’s bye in 2026?', 'Byes run Week 5 through Week 14 in 2026. Check the bye-week grid — it’s derived straight from the nflverse schedule — and use the roster conflict checker to spot weeks where several of your players are off.'],
  ['What’s a good draft order reveal idea?', 'Post the commitment (the seed’s hash) in your group chat, then run suspense mode on the living-room TV and reveal the last pick first. Send the verify link afterward so everyone can confirm it was fair. Bonus: attach the draft-party calendar invite.'],
  ['Is ADP different on ESPN and Sleeper?', 'Yes. ADP varies by platform, scoring format, and league size because different pools draft differently. We label every series with its format and size and never blend them; the compare view shows deltas across like formats.'],
  ['Do I need an account?', 'No. Every tool works with no login, and nothing about your league is stored on our servers. Share links carry everything needed to reproduce a result.'],
  ['Do you sell rankings or projections?', 'No, and we won’t. We publish market data — where players actually go, what the crowd is adding — with sources and dates. Opinions are somebody else’s business.'],
];
page('/faq/',
  'FAQ — DukeFantasy',
  'Answers to the common questions: fair draft-order randomization, snake pick numbers, 2026 bye weeks, ADP differences across platforms, and whether you need an account (you don’t).',
  `<h1>Frequently asked questions</h1>${FAQ.map(([q, a]) => `<h2>${esc(q)}</h2><p>${a}</p>`).join('')}
  ${sourcesBlock([SRC.ffc, SRC.sleeper, SRC.nflverse, SRC.openmeteo])}`,
  { jsonld: [ldFaq(FAQ)] });

/* ---- Methodology ---- */
page('/methodology/',
  'Methodology — how every number and tool works',
  'Exactly how DukeFantasy works: the commit–reveal fairness scheme, the weighted-lottery odds math, the deterministic tier-clustering algorithm, what ADP is and isn’t, snake math, and the weather flag rules. Transparent by design.',
  `<h1>Methodology</h1>
  <p class="muted">Our covenant: every number is sourced, stamped, and format-labeled, and every tool’s math is documented. If we can’t explain it plainly, we don’t ship it.</p>

  <h2 id="commit-reveal">Commit–reveal draft order</h2>
  <p>On setup, the browser draws a random seed via <code>crypto.getRandomValues</code>. We compute <code>commitment = SHA-256(seed)</code> and show it before the reveal so it can be shared and “locked.” The draft order is derived by seeding a 32-bit PRNG (cyrb128 → sfc32) from a stable string built out of the seed, the exact team list, the mode, and (for lotteries) the weights, then running a Fisher–Yates shuffle. Because it uses only integer math, every browser produces the identical order. Verification recomputes SHA-256(seed) against the commitment and re-derives the order against the published one. <strong>Honest limit:</strong> commit–reveal proves the order was fixed before the reveal and produced by this algorithm from this seed; it can’t prove the commissioner didn’t pre-generate seeds, which is why we use a CSPRNG and commit immediately.</p>

  <h2 id="lottery">Weighted lottery odds</h2>
  <p>The draw picks a team first with probability equal to its weight ÷ total weight, removes it, and repeats. We compute the <em>exact</em> probability of every team landing every slot via a subset dynamic-program (not a simulation) and display it before the draw. A Monte-Carlo check confirms the seeded draw matches the exact table.</p>

  <h2 id="adp">ADP</h2>
  <p>Average Draft Position is the mean draft slot across real drafts, sourced from Fantasy Football Calculator’s public mock-draft API. It’s market data, not a ranking. Scoring format and league size are first-class labels on every series; we refuse to average across formats. Deltas across formats are shown side-by-side and framed in plain English.</p>

  <h2 id="tiers">Market tiers</h2>
  <p>We sort by ADP and start a new tier wherever the gap to the next player exceeds a set multiple (default 2.5×) of the median gap. It’s deterministic — same input, same tiers — and it describes where the crowd’s behavior clusters. We call them <em>market</em> tiers to be clear they’re not our opinion.</p>

  <h2 id="snake">Snake &amp; auction math</h2>
  <p>Snake pick numbers are pure arithmetic: odd rounds run forward, even rounds reverse; third-round reversal repeats round 2’s order into round 3, then resumes. The auction splitter distributes your cap across roster slots by a preset weight table, guaranteeing $1 minimums and an exact total. No projections anywhere — just arithmetic.</p>

  <h2 id="weather">Weather flags</h2>
  <p>We pull Open-Meteo forecasts at each outdoor game’s kickoff (matched on the UTC instant), flag wind ≥ 15 mph (alert at 20+), meaningful precipitation, and temperature extremes, and mark domes no-impact. We render only within the ~7-day reliable window, label lead-time confidence, and stamp the fetch time. We describe conditions and general effects — never start/sit advice.</p>

  <h2 id="freshness">Freshness &amp; fallback</h2>
  <p>Every dataset carries an “as of {date}” stamp. Feeds load edge-cache → direct → last-good copy, so you always see something with its provenance, never a blank. Stale data renders with a visible staleness note.</p>
  ${sourcesBlock([SRC.ffc, SRC.sleeper, SRC.nflverse, SRC.openmeteo])}`);

/* ---- Sources ---- */
page('/sources/',
  'Sources & terms — the data behind DukeFantasy',
  'Every data source we use, its license or terms, its refresh cadence, and the exact attribution its owner asks for. We only ship open or explicitly-permitted data.',
  `<h1>Sources &amp; terms</h1>
  <p class="muted">We only ship data that is open or explicitly permitted for use. Sources we can’t use under their terms (like scraped platform data) are deliberately excluded.</p>
  <div class="table-scroll"><table>
    <thead><tr><th>Source</th><th>What we use it for</th><th>Terms</th><th>Attribution</th></tr></thead>
    <tbody>
      <tr><td>Fantasy Football Calculator</td><td>ADP by format &amp; league size</td><td>Permitted (free for apps, attribution required)</td><td>ADP data by Fantasy Football Calculator</td></tr>
      <tr><td>Sleeper</td><td>Player registry, trending adds/drops, season state</td><td>Permitted (public API; fetched politely, cached daily)</td><td>Data provided by Sleeper</td></tr>
      <tr><td>nflverse</td><td>2026 schedule, byes, kickoffs, team metadata</td><td>Open (CC BY 4.0 / openly published)</td><td>Schedule &amp; team data via nflverse</td></tr>
      <tr><td>Open-Meteo</td><td>Kickoff weather (in-season)</td><td>Open (CC BY 4.0, keyless)</td><td>Weather data by Open-Meteo.com</td></tr>
      <tr><td>Underdog ADP</td><td>—</td><td class="muted">Excluded (no republication-permitted export)</td><td>—</td></tr>
      <tr><td>ESPN / Yahoo endpoints</td><td>—</td><td class="muted">Excluded (undocumented, unlicensed)</td><td>—</td></tr>
    </tbody>
  </table></div>
  <p class="small muted">Platform names are used nominatively (e.g. “ESPN ADP” as a label). No logos or marks are reproduced, and we reproduce no editorial content. See our <a href="/methodology/">methodology</a> for how each feed is processed and stamped.</p>`);

/* ---- Updates (newsjack-driven changelog placeholder) ---- */
page('/updates/',
  'Updates — what’s new & what’s next',
  'What’s new at DukeFantasy and what’s coming as draft season builds toward kickoff. Sign up for the Draft Week Checklist.',
  `<h1>Updates</h1>
  <p class="muted">A running log as we build toward kickoff. For the seasonal calendar behind these, see the ops notes.</p>
  <div class="card"><h3 style="margin-top:0">Now — draft season is live</h3><p class="muted small">The flagship draft-order reveal, verifier, snake calculator, ADP explorer, market tiers, bye weeks, cheat sheet, auction budget, name generator, and countdown are all live on verified open data.</p></div>
  <div class="card"><h3 style="margin-top:0">Next — the in-season pivot</h3><p class="muted small">At Week 1 the site flips to the weather board + waiver radar automatically. The Draft Party Kit (printable board, name cards, ceremony scripts) is in the works.</p></div>
  <div style="max-width:520px">${emailCapture('Draft Week Checklist', 'updates')}</div>`);

/* ---- About ---- */
page('/about/',
  'About DukeFantasy',
  'DukeFantasy is a fantasy football draft HQ built on verified open data: a provably-fair draft-order reveal and a fast, free, no-login utility belt. Market data + fair tools, no hot takes.',
  `<h1>About</h1>
  <p>We’re the sharp, fair league-mate who brings the spreadsheet and the good snacks. We don’t host leagues — ESPN, Yahoo, and Sleeper do that well. We don’t publish rankings, projections, or hot takes — that treadmill is crowded. We own two things: the <strong>ceremony</strong> (a draft-order reveal your whole league can verify) and the <strong>utility belt</strong> (fast, free, no-login tools on permitted open data).</p>
  <p>Our one promise is honesty. Every number is sourced, stamped, and format-labeled. Every tool’s math is documented on the <a href="/methodology/">methodology page</a>. When a data feed lags, we show the last good copy with a note instead of pretending. That’s the whole brand: <strong>${esc(SITE.identityLine)}</strong></p>
  <p>Not affiliated with the NFL or any fantasy platform. Questions? <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`);

/* ---- Responsible Gaming ---- */
page('/responsible-gaming/',
  'Responsible Gaming',
  'Responsible gaming resources. If gambling stops being fun, help is available. Must be 21+. Call 1-800-GAMBLER.',
  `<h1>Responsible gaming</h1>
  <p><span class="rg-badge">21+</span> Any sportsbook or DFS offer on this site is for adults of legal age, available only where legal, and void where prohibited. Odds and promotions are set by the operators, not by us.</p>
  <h2>If it stops being fun</h2>
  <p>Betting should be entertainment, never a way to make money or chase losses. If it’s becoming a problem for you or someone you know, help is free and confidential:</p>
  <ul>
    <li><strong>Call or text 1-800-GAMBLER</strong> (1-800-426-2537).</li>
    <li>National Problem Gambling Helpline: <a href="https://www.ncpgambling.org/" rel="nofollow noopener">ncpgambling.org</a>.</li>
    <li>Most operators offer deposit limits, cool-off periods, and self-exclusion — use them.</li>
  </ul>
  <p class="muted small">DukeFantasy earns referral commissions from some partners. That never changes our data, and we keep gambling promotions off our party-facing pages (the reveal, the lottery, the name generator).</p>`);

/* ---- Legal: Privacy ---- */
page('/privacy/',
  'Privacy Policy',
  'How DukeFantasy handles data: no accounts, no league data on our servers, tools run in your browser, and email is only used if you opt in.',
  `<h1>Privacy policy</h1>
  <p class="muted small">Last updated <span class="year-now">2026</span>.</p>
  <h2>The short version</h2>
  <p>No accounts. No login. Your tools run in your browser, and your draft/league data isn’t stored on our servers — draft-order results live entirely in the share link you choose to send. We collect as little as possible.</p>
  <h2>What we store</h2>
  <ul>
    <li><strong>In your browser (local storage):</strong> your cheat sheet, theme choice, and cached data feeds. This never leaves your device and you can clear it anytime.</li>
    <li><strong>Email:</strong> only if you submit it to a newsletter form. We use it to send what you asked for and you can unsubscribe anytime. We don’t sell it.</li>
    <li><strong>Analytics &amp; ads:</strong> we may use privacy-respecting analytics and display ads; these can set cookies. Affiliate links may record that a click came from us.</li>
  </ul>
  <h2>Third parties</h2>
  <p>Data feeds come from Sleeper, Fantasy Football Calculator, nflverse, and Open-Meteo (see <a href="/sources/">Sources</a>). We fetch them through our own edge cache; your browser doesn’t call them directly. Questions: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`);

/* ---- Legal: Terms ---- */
page('/terms/',
  'Terms of Use',
  'The terms for using DukeFantasy’s free tools and content.',
  `<h1>Terms of use</h1>
  <p class="muted small">Last updated <span class="year-now">2026</span>.</p>
  <p>DukeFantasy provides free fantasy-football tools and market data “as is,” for entertainment and informational purposes. By using the site you agree to these terms.</p>
  <h2>No guarantees</h2>
  <p>We work hard to keep data accurate and stamped, but sources can lag or change, and we make no warranty of accuracy, completeness, or fitness for a particular purpose. Decisions you make are your own.</p>
  <h2>Acceptable use</h2>
  <p>Use the tools for your own leagues. Don’t scrape at abusive rates, resell our feeds, or misrepresent the fairness verification. The commit–reveal verifier is provided so anyone can independently check a result.</p>
  <h2>Third-party offers</h2>
  <p>Sportsbook/DFS offers, where present, are governed by the operators’ own terms and are for those 21+ where legal. See <a href="/responsible-gaming/">Responsible Gaming</a>.</p>
  <p>Questions: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`);

/* ---- Legal: Disclaimer ---- */
page('/disclaimer/',
  'Disclaimer',
  'DukeFantasy is not affiliated with the NFL or any fantasy platform. Team names are used nominatively. ADP is market data, not advice.',
  `<h1>Disclaimer</h1>
  <p>DukeFantasy is an independent site. We are <strong>not affiliated with, endorsed by, or sponsored by</strong> the National Football League, ESPN, Yahoo, Sleeper, Underdog, or any other league host or media brand. Team names and platform names are used <strong>nominatively</strong> — as factual labels — and no logos or marks are reproduced.</p>
  <p>ADP and trending figures are <strong>market data</strong> — what real drafters and league managers are doing — not rankings, projections, or advice. Weather information is descriptive and provided for context only. Nothing here is a guarantee of outcomes.</p>
  <p>Where gambling-related offers appear, they’re for adults 21+ where legal; please play responsibly and see our <a href="/responsible-gaming/">Responsible Gaming</a> page.</p>`);

/* ---- 404 ---- */
add({
  path: '/404',
  title: 'Page not found',
  description: 'That page isn’t here. Head back to the draft HQ.',
  body: `<section class="section"><div class="wrap center stack" style="max-width:560px;margin:0 auto">
    <p class="eyebrow">404</p>
    <h1>That page got cut in the final roster move.</h1>
    <p class="muted">Let’s get you back to something useful.</p>
    <div class="row" style="max-width:420px;margin:0 auto"><a class="btn btn-primary" href="/">Home</a><a class="btn" href="/draft-order-randomizer/">Draft Order</a><a class="btn" href="/adp/">ADP</a></div>
  </div></section>`,
});
