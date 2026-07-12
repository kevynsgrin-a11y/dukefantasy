#!/usr/bin/env node
/**
 * DukeFantasy build step.
 *
 * The site is static-first and dependency-free. The only "build" is:
 *   1. Copy the canonical pure engines from src/engine/ -> public/engine/
 *      so the browser can import the exact same modules the tests exercise.
 *   2. Copy frozen data fixtures from fixtures/ -> public/data/ so the client
 *      has a last-good baseline to fall back to (the triple-fallback covenant)
 *      and so tools work with zero network on first paint.
 *
 * Canonical source of truth stays in src/engine and fixtures; the copies under
 * public/ are generated artifacts (git-ignored). Run before dev/deploy.
 */
import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const COPIES = [
  { from: 'src/engine', to: 'public/engine' },
  { from: 'fixtures', to: 'public/data' },
];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function run() {
  for (const { from, to } of COPIES) {
    const src = join(root, from);
    const dest = join(root, to);
    if (!(await exists(src))) {
      console.warn(`[build] skip: ${from} does not exist yet`);
      continue;
    }
    await rm(dest, { recursive: true, force: true });
    await mkdir(dest, { recursive: true });
    await cp(src, dest, { recursive: true });
    const n = (await readdir(dest, { recursive: true })).length;
    console.log(`[build] ${from} -> ${to} (${n} entries)`);
  }
  // Generate the static HTML site (pages + sitemap/robots/ads/manifest/og).
  const { generateSite } = await import('./gen.js');
  await generateSite();
  console.log('[build] done');
}

run().catch((err) => {
  console.error('[build] failed:', err);
  process.exit(1);
});
