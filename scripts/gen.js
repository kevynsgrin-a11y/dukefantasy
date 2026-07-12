/**
 * gen.js — assemble the static site: write every page, then the sitemap,
 * robots, ads.txt, web manifest, favicon, and a default OG image. Invoked by
 * scripts/build.js after engines + fixtures are copied.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE, writePage } from './pages.js';
import './content.js';
import './content-tools.js';
import './content-spokes.js';
import { PAGES } from './content.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0b6b3a"/><path d="M8 8h9a8 8 0 0 1 0 16H8z" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M8 16h11" stroke="#e0b64a" stroke-width="2.4" stroke-linecap="round"/></svg>`;

const OG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0e1116"/>
  <rect width="1200" height="8" y="0" fill="#0b6b3a"/>
  <rect width="1200" height="8" y="622" fill="#b8860b"/>
  <text x="80" y="180" fill="#eef1f5" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="84" font-weight="800">DukeFantasy</text>
  <text x="80" y="300" fill="#2ea16a" font-family="system-ui,sans-serif" font-size="52" font-weight="700">Provably-fair draft order.</text>
  <text x="80" y="372" fill="#eef1f5" font-family="system-ui,sans-serif" font-size="52" font-weight="700">Fair tools. No hot takes.</text>
  <text x="80" y="520" fill="#8a95a3" font-family="system-ui,sans-serif" font-size="34">Market data + fair tools · built on verified open data</text>
</svg>`;

function sitemap() {
  const urls = PAGES.filter((p) => p.path !== '/404')
    .map((p) => `  <url><loc>${SITE.origin}${p.path}</loc><changefreq>${p.mode ? 'daily' : 'weekly'}</changefreq></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE.origin}/sitemap.xml\n`;
const adsTxt = `# ads.txt — add your ad partner lines when display ads go live.\n# Example: google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n`;
const manifest = JSON.stringify({
  name: 'DukeFantasy', short_name: 'DukeFantasy', start_url: '/', display: 'standalone',
  background_color: '#0e1116', theme_color: '#0b6b3a',
  description: 'Provably-fair fantasy draft order + fair tools. No hot takes.',
  icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
}, null, 2);

export async function generateSite() {
  const written = [];
  for (const p of PAGES) written.push(await writePage(p));
  await mkdir(join(OUT, 'og'), { recursive: true });
  await writeFile(join(OUT, 'sitemap.xml'), sitemap());
  await writeFile(join(OUT, 'robots.txt'), robots);
  await writeFile(join(OUT, 'ads.txt'), adsTxt);
  await writeFile(join(OUT, 'site.webmanifest'), manifest);
  await writeFile(join(OUT, 'favicon.svg'), FAVICON);
  await writeFile(join(OUT, 'og', 'default.svg'), OG);
  console.log(`[gen] wrote ${written.length} pages + sitemap/robots/ads/manifest/favicon/og`);
  return written.length;
}

// Allow running standalone: `node scripts/gen.js`
if (import.meta.url === `file://${process.argv[1]}`) generateSite().catch((e) => { console.error(e); process.exit(1); });
