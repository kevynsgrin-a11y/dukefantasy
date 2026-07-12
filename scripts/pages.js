/**
 * DukeFantasy static-site generator.
 *
 * Emits the full public IA as vanilla HTML (real content in markup for SEO +
 * no-JS resilience) with a shared, DRY layout: consistent chrome, unique
 * titles/canonicals, JSON-LD, the identity line in the footer, RG footer, and
 * data-honesty scaffolding. Tool pages mount a per-tool ES module that binds to
 * the engines. Output is written under public/ by scripts/build.js.
 *
 * The generator is the source of truth; generated HTML is a build artifact.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public');

export const SITE = {
  name: 'DukeFantasy',
  origin: 'https://dukefantasy.com',
  tagline: 'Market data + fair tools. No hot takes.',
  identityLine: 'Market data and fair tools — zero hot takes.',
  email: 'hello@dukefantasy.com',
  season: 2026,
  kickoffISO: '2026-09-10T00:20:00Z', // Wed Sep 9 20:20 ET (data-derived first game)
  kickoffLabel: 'Wed, Sep 9, 2026',
};

const NAV = [
  { href: '/draft-order-randomizer/', label: 'Draft Order' },
  { href: '/adp/', label: 'ADP' },
  { href: '/snake-draft-pick-calculator/', label: 'Pick Calculator' },
  { href: '/bye-weeks-2026/', label: 'Bye Weeks' },
  { href: '/draft-strategy-basics/', label: 'Strategy' },
];

const FOOTER = [
  { title: 'The Reveal', links: [
    ['/draft-order-randomizer/', 'Draft Order Randomizer'],
    ['/draft-lottery/', 'Weighted Draft Lottery'],
    ['/verify/', 'Verify a Draft Order'],
    ['/draft-countdown/', 'Draft Countdown'],
  ]},
  { title: 'Draft Tools', links: [
    ['/snake-draft-pick-calculator/', 'Snake Pick Calculator'],
    ['/adp/', 'ADP Explorer'],
    ['/adp/compare/', 'ADP Compare'],
    ['/tiers/', 'Market Tiers'],
    ['/cheat-sheet/', 'Cheat Sheet Builder'],
    ['/auction-budget-calculator/', 'Auction Budget'],
    ['/league-name-generator/', 'League Name Generator'],
  ]},
  { title: 'In-Season', links: [
    ['/bye-weeks-2026/', 'Bye Weeks 2026'],
    ['/weather/', 'Weather Board'],
    ['/waiver-radar/', 'Waiver Radar'],
  ]},
  { title: 'The House', links: [
    ['/about/', 'About'],
    ['/methodology/', 'Methodology'],
    ['/sources/', 'Sources'],
    ['/faq/', 'FAQ'],
    ['/updates/', 'Updates'],
    ['/responsible-gaming/', 'Responsible Gaming'],
    ['/privacy/', 'Privacy'],
    ['/terms/', 'Terms'],
    ['/disclaimer/', 'Disclaimer'],
  ]},
];

/* ---------- partials ---------- */
function header(current) {
  const links = NAV.map((n) =>
    `<a href="${n.href}"${current === n.href ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  return `<header class="site-header"><div class="wrap">
    <a class="brandmark" href="/"><span class="mark">${logoSvg()}</span> Duke<span class="mark">Fantasy</span></a>
    <button class="btn btn-ghost nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ICON_MENU}</button>
    <nav id="site-nav" class="nav" aria-label="Primary">${links}
      <button class="btn btn-ghost small theme-toggle" type="button" aria-label="Toggle light/dark">${ICON_SUN}</button>
    </nav>
  </div></header>`;
}

function footer() {
  const cols = FOOTER.map((c) => `<div><h4>${c.title}</h4><ul>${
    c.links.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')
  }</ul></div>`).join('');
  return `<footer class="site-footer"><div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brandmark" href="/"><span class="mark">${logoSvg()}</span> DukeFantasy</a>
        <p class="identity-line" style="margin-top:12px">${SITE.identityLine}</p>
        <p class="small muted">Not affiliated with the NFL or any fantasy platform. Team names are used nominatively. ADP is market data, not advice.</p>
        <p class="small"><span class="rg-badge">21+</span> Gambling problem? Call 1-800-GAMBLER. <a href="/responsible-gaming/">Resources</a>.</p>
      </div>
      ${cols}
    </div>
    <p class="small muted" style="margin-top:24px">© <span class="year-now">2026</span> DukeFantasy · <a href="/sources/">Sources</a> · <a href="/methodology/">Methodology</a> · Built on open data from nflverse, Sleeper, Fantasy Football Calculator &amp; Open-Meteo.</p>
  </div></footer>`;
}

/* ---------- layout ---------- */
export function layout(p) {
  const canonical = SITE.origin + p.path;
  const title = p.title.includes('DukeFantasy') ? p.title : `${p.title} · DukeFantasy`;
  const jsonld = (p.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('');
  const moduleTag = p.module ? `<script type="module" src="${p.module}"></script>` : '';
  return `<!doctype html>
<html lang="en"${p.mode ? ` data-mode="${p.mode}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${escapeAttr(p.description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DukeFantasy">
<meta property="og:title" content="${escapeAttr(p.ogTitle || p.title)}">
<meta property="og:description" content="${escapeAttr(p.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.origin}/og/default.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b6b3a">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/theme.css">
<link rel="stylesheet" href="/brand.css">
${jsonld}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(p.path)}
<main id="main">${p.body}</main>
${footer()}
<script type="module" src="/app/ui.js"></script>
${moduleTag}
</body>
</html>`;
}

/* ---------- JSON-LD helpers ---------- */
export function ldWebApp(name, desc, path) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name, description: desc,
    url: SITE.origin + path, applicationCategory: 'SportsApplication', operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true, publisher: ldOrg() };
}
export function ldOrg() {
  return { '@type': 'Organization', name: 'DukeFantasy', url: SITE.origin,
    slogan: SITE.identityLine, email: SITE.email };
}
export function ldFaq(qas) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qas.map(([q, a]) => ({ '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a } })) };
}
export function ldBreadcrumb(trail) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name,
      item: SITE.origin + path })) };
}

/* ---------- svg / escaping ---------- */
const ICON_MENU = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
function logoSvg() {
  return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h9a7 7 0 0 1 0 14H4z"/><path d="M4 11h10" stroke-linecap="round"/></svg>';
}
export function escapeAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
export function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ---------- writer ---------- */
export async function writePage(p) {
  const outPath = p.path === '/' ? join(OUT, 'index.html')
    : p.path === '/404' ? join(OUT, '404.html')
    : join(OUT, p.path.replace(/^\/|\/$/g, ''), 'index.html');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, layout(p), 'utf8');
  return outPath;
}
