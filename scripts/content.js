/**
 * content.js — every page's content + SEO metadata. Voice: the sharp, fair
 * league-mate who brings the spreadsheet and the good snacks. Plain, quick,
 * zero guru posturing. The identity line lives in the footer (once per page).
 */
import { SITE, ldWebApp, ldFaq, ldBreadcrumb, ldOrg, esc } from './pages.js';

/* ---------- shared content blocks ---------- */
const crumbs = (trail) => ldBreadcrumb([['Home', '/'], ...trail]);

function toolHero({ eyebrow, h1, sub, mount }) {
  return `<section class="tool-hero"><div class="wrap stack">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${h1}</h1>
    <p class="muted" style="max-width:60ch">${sub}</p>
    ${mount}
  </div></section>`;
}

function adSlot(id, size = 'rectangle') {
  return `<div class="ad-slot" data-size="${size}" data-ad-slot="${id}" aria-hidden="true"><span>ad · ${size}</span></div>`;
}

/** Compliance-gated affiliate slot — 21+, state disclaimer, RG, FTC. Adult-intent pages only. */
function affiliateSlot(id, label, blurb) {
  return `<aside class="affiliate-slot" data-affiliate-slot="${id}" role="complementary" aria-label="Partner offer">
    <span class="badge badge-accent">21+ · sponsored</span>
    <h3>${label}</h3>
    ${blurb ? `<p class="muted small">${blurb}</p>` : ''}
    <button class="btn btn-accent" type="button" disabled>Offer coming soon</button>
    <div class="compliance-gate">
      <p><strong>21+ only.</strong> Available only where legal. Void where prohibited. Eligibility and offers vary by state.</p>
      <p>Gambling problem? Call <strong>1-800-GAMBLER</strong>. See our <a href="/responsible-gaming/">Responsible Gaming</a> resources.</p>
    </div>
    <p class="ftc">Advertising disclosure: partner links may earn us a commission at no cost to you. It never touches our data.</p>
  </aside>`;
}

function emailCapture(magnet, tag) {
  return `<form class="email-capture card" data-tag="${tag}">
    <h3>Get the ${magnet}</h3>
    <p class="muted small">One email. No spam. Unsubscribe anytime.</p>
    <div class="row">
      <input type="email" name="email" required placeholder="you@email.com" aria-label="Email address">
      <button class="btn btn-primary" type="submit">Send it</button>
    </div>
    <p class="form-status small muted" role="status"></p>
  </form>`;
}

function sourcesBlock(items) {
  const links = items.map((s) => s.url
    ? `<a href="${s.url}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a>` : esc(s.label)).join(' · ');
  return `<div class="sources-block"><strong>Sources &amp; attribution:</strong> ${links}. <a href="/sources/">Full source list &amp; terms →</a></div>`;
}

const SRC = {
  ffc: { label: 'ADP data by Fantasy Football Calculator', url: 'https://fantasyfootballcalculator.com/' },
  sleeper: { label: 'Player data & trending by Sleeper', url: 'https://sleeper.com/' },
  nflverse: { label: 'Schedule & team data via nflverse', url: 'https://github.com/nflverse' },
  openmeteo: { label: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/' },
};

function explainer(inner) { return `<section class="section"><div class="wrap"><div class="explainer stack">${inner}</div></div></section>`; }
function faqBlock(qas) {
  return `<h2>FAQ</h2>` + qas.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join('');
}

/* ============================================================================
   PAGES
   ============================================================================ */
export const PAGES = [];
const add = (p) => PAGES.push(p);

/* ---- HOME (seasonal-mode hub; JS refines mode, HTML is draft-mode default) ---- */
add({
  path: '/', mode: 'draft',
  title: 'DukeFantasy — Fantasy Draft HQ: a provably-fair draft order + fair tools',
  ogTitle: 'DukeFantasy — provably-fair draft order + a no-login utility belt',
  description: 'The fantasy football draft HQ built on verified open data. Run a provably-fair draft-order reveal, explore real ADP with per-source deltas, and use a fast, free, no-login utility belt. Market data + fair tools, no hot takes.',
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DukeFantasy', url: SITE.origin,
      potentialAction: { '@type': 'SearchAction', target: SITE.origin + '/adp/?q={q}', 'query-input': 'required name=q' } },
    { '@context': 'https://schema.org', ...ldOrg() },
  ],
  module: '/app/pages/home.js',
  body: `
<section class="hero"><div class="wrap">
  <p class="eyebrow">Draft season is open · kickoff ${SITE.kickoffLabel}</p>
  <h1>The draft-night HQ that proves it’s fair.</h1>
  <p class="muted" style="max-width:62ch;font-size:1.1rem">We don’t host your league, publish rankings, or sell hot takes. We own the ceremony and the utility belt: a <strong>provably-fair draft-order reveal</strong> your whole league can verify, plus fast, free, no-login tools built on real market data.</p>
  <div class="row" style="max-width:520px;margin-top:8px">
    <a class="btn btn-primary btn-lg" href="/draft-order-randomizer/">Run the Draft Order Reveal</a>
    <a class="btn btn-lg" href="/adp/">Explore ADP</a>
  </div>
  <div id="countdown-hero" class="countdown" style="margin-top:28px" data-kickoff="${SITE.kickoffISO}">
    <div class="unit"><div class="n" data-cd="days">—</div><div class="l">days</div></div>
    <div class="unit"><div class="n" data-cd="hours">—</div><div class="l">hours</div></div>
    <div class="unit"><div class="n" data-cd="minutes">—</div><div class="l">min</div></div>
    <div class="unit"><div class="n" data-cd="seconds">—</div><div class="l">sec</div></div>
  </div>
  <p class="small muted" style="margin-top:8px">Counting down to the first game of the ${SITE.season} season — <strong>${SITE.kickoffLabel}</strong> (verified from the nflverse schedule; renders without JavaScript).</p>
</div></section>

<section class="section"><div class="wrap">
  <h2>The flagship: a draft order you can check yourself</h2>
  <p class="muted" style="max-width:62ch">Every league randomizes its order once a year and the commissioner broadcasts it to everyone. We productize that moment. We publish the hash of a random seed <em>before</em> the reveal, reveal the order, then hand you the seed — so anyone can re-run the math and confirm nothing was rigged.</p>
  <div class="grid grid-tools" style="margin-top:16px">
    ${toolCard('dice', '/draft-order-randomizer/', 'Draft Order Randomizer', 'Commit → reveal → share. Suspense mode for the group chat.')}
    ${toolCard('trophy', '/draft-lottery/', 'Weighted Lottery', 'NBA-style odds for keeper & dynasty leagues.')}
    ${toolCard('shieldCheck', '/verify/', 'Verify a Draft Order', 'Paste a link or seed. We reproduce the order and check the commitment.')}
  </div>
</div></section>

<section class="section"><div class="wrap">
  <h2>The utility belt</h2>
  <div class="grid grid-tools" style="margin-top:16px">
    ${toolCard('grid', '/snake-draft-pick-calculator/', 'Snake Pick Calculator', 'Your exact pick numbers, every round. Third-round reversal supported.')}
    ${toolCard('chart', '/adp/', 'ADP Explorer', 'Real ADP by scoring format & league size, per-source deltas.')}
    ${toolCard('layers', '/tiers/', 'Market Tiers', 'Deterministic tier breaks from ADP gaps — market behavior, not opinion.')}
    ${toolCard('calendar', '/bye-weeks-2026/', 'Bye Weeks 2026', 'The bye grid + a roster conflict checker.')}
    ${toolCard('clipboard', '/cheat-sheet/', 'Cheat Sheet Builder', 'ADP-baseline list, drag to adjust, print-ready.')}
    ${toolCard('money', '/auction-budget-calculator/', 'Auction Budget', 'Split your cap across roster slots by strategy.')}
    ${toolCard('tag', '/league-name-generator/', 'League Name Generator', 'Because the league needs a name before it needs a draft.')}
    ${toolCard('clock', '/draft-countdown/', 'Draft Countdown', 'Count down to your draft + a one-click calendar invite.')}
  </div>
</div></section>

<section class="section" data-inseason-hidden><div class="wrap">
  <div class="card">
    <h2 style="margin-top:0">When the games start, the board flips</h2>
    <p class="muted">Once Week 1 kicks off, this site automatically pivots to an in-season retention layer: a descriptive <a href="/weather/">weather board</a> (wind, precip, cold — conditions, never start/sit advice) and a <a href="/waiver-radar/">waiver radar</a> of the most-added players. Same honesty rules; different job.</p>
  </div>
</div></section>

<section class="section"><div class="wrap" style="max-width:640px">
  ${emailCapture('Draft Week Checklist', 'draft-week')}
</div></section>

<section class="section"><div class="wrap">
  <h2>Why we’re different</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
    <div class="card"><h3>Everything is sourced</h3><p class="muted small">Every number is stamped with its source, date, and format. Built on Sleeper, Fantasy Football Calculator, nflverse, and Open-Meteo — all permitted open data. <a href="/sources/">See the sources</a>.</p></div>
    <div class="card"><h3>No login, ever</h3><p class="muted small">No account, no email wall on the tools, no server storing your league. The share link <em>is</em> the record.</p></div>
    <div class="card"><h3>Zero hot takes</h3><p class="muted small">We don’t publish rankings, projections, or start/sit calls. We show what the market is doing and let you decide. <a href="/methodology/">Our methodology</a>.</p></div>
  </div>
</div></section>`,
});
function toolCard(ic, href, title, desc) {
  return `<a class="card tool-card" href="${href}">${iconInline(ic)}<h3>${title}</h3><p>${desc}</p></a>`;
}
function iconInline(name) {
  // minimal inline icons reused from theme; ui.js also has the full set.
  const map = {
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/><circle cx="16" cy="16" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>',
    trophy: '<path d="M7 4h10v3a5 5 0 0 1-10 0z"/><path d="M10 12.5V15M8 20h8M9 20a3 3 0 0 1 6 0"/>',
    shieldCheck: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>',
    chart: '<path d="M4 4v16h16"/><path d="M7 15l3-4 3 2 4-6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M9 11h6"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    tag: '<path d="M3 12l9-9 8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  return `<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${map[name] || ''}</svg>`;
}

export { toolHero, adSlot, affiliateSlot, emailCapture, sourcesBlock, SRC, explainer, faqBlock, crumbs, add, iconInline };
