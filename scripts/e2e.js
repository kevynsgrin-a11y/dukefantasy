#!/usr/bin/env node
/**
 * e2e.js — headless smoke + the flagship commit–reveal loop.
 * Uses the pre-installed Chromium via playwright-core. Starts the static server,
 * loads every page (collecting console/page errors), then drives:
 *   run randomizer -> open the share link in a FRESH page -> verify it reproduces
 *   and the commitment matches. Exits non-zero on any console error or failure.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 8791;
const BASE = `http://localhost:${PORT}`;

function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of readdirSync(root)) {
    if (!d.startsWith('chromium-')) continue;
    for (const c of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
      const p = join(root, d, c);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('chromium not found under ' + root);
}

const PAGES = [
  '/', '/draft-order-randomizer/', '/draft-lottery/', '/verify/',
  '/snake-draft-pick-calculator/', '/adp/', '/adp/compare/', '/tiers/',
  '/bye-weeks-2026/', '/cheat-sheet/', '/auction-budget-calculator/',
  '/league-name-generator/', '/draft-countdown/', '/weather/', '/waiver-radar/',
  '/faq/', '/methodology/', '/sources/', '/responsible-gaming/', '/404',
];

async function main() {
  const server = spawn(process.execPath, [join(import.meta.dirname, 'serve.js'), String(PORT)], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
  const results = { pages: [], errors: [], loop: null };

  try {
    // 1) Load every page, collect errors.
    for (const path of PAGES) {
      const page = await browser.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(300);
      const status = resp ? resp.status() : 0;
      // ignore benign clipboard/fetch-abort noise
      const real = errs.filter((e) => !/clipboard|Failed to load resource.*favicon/i.test(e));
      results.pages.push({ path, status, errors: real });
      if (real.length) results.errors.push({ path, errors: real });
      await page.close();
    }

    // 2) Flagship loop: run -> share link -> verify (fresh page).
    const rp = await browser.newPage();
    const rpErr = [];
    rp.on('pageerror', (e) => rpErr.push(e.message));
    await rp.goto(BASE + '/draft-order-randomizer/', { waitUntil: 'networkidle' });
    await rp.fill('textarea[name=teams]', ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'].join('\n'));
    await rp.selectOption('select[name=mode]', 'instant');
    await rp.click('button[type=submit]');
    await rp.waitForSelector('.commitment-badge', { timeout: 8000 });
    const commitment = (await rp.textContent('.commitment-badge')).trim();
    await rp.click('button:has-text("Reveal the order")');
    await rp.waitForSelector('a:has-text("Open verifier")', { timeout: 8000 });
    const verifyHref = await rp.getAttribute('a:has-text("Open verifier")', 'href');
    const revealOrder = await rp.$$eval('table tbody tr td:nth-child(2)', (tds) => tds.map((t) => t.textContent.trim()));

    // Fresh page -> the share link.
    const vp = await browser.newPage();
    const vpErr = [];
    vp.on('pageerror', (e) => vpErr.push(e.message));
    await vp.goto(verifyHref, { waitUntil: 'networkidle' });
    // Put the pre-reveal commitment in and verify.
    await vp.fill('input[name=commitment]', commitment);
    await vp.click('button:has-text("Verify")');
    await vp.waitForSelector('.verify-ok, .verify-bad', { timeout: 8000 });
    const okText = await vp.textContent('.verify-ok').catch(() => null);
    const reproduced = await vp.$$eval('.verify-result table tbody tr td:nth-child(2)', (tds) => tds.map((t) => t.textContent.trim()));

    const orderMatches = JSON.stringify(revealOrder) === JSON.stringify(reproduced) && revealOrder.length === 6;
    results.loop = {
      commitmentCaptured: !!commitment && commitment.length === 64,
      verifiedOk: !!okText,
      orderMatches,
      revealOrder, reproduced,
      errors: [...rpErr, ...vpErr],
    };
    await rp.close(); await vp.close();
  } finally {
    await browser.close();
    server.kill();
  }

  // Report.
  const pageErrCount = results.errors.length;
  console.log('\n=== PAGE LOAD ===');
  for (const p of results.pages) console.log(`${p.errors.length ? 'FAIL' : ' ok '} ${String(p.status).padEnd(4)} ${p.path}${p.errors.length ? '  ' + p.errors.join(' | ') : ''}`);
  console.log('\n=== FLAGSHIP LOOP ===');
  console.log(JSON.stringify(results.loop, null, 2));

  const loopOk = results.loop && results.loop.commitmentCaptured && results.loop.verifiedOk && results.loop.orderMatches && results.loop.errors.length === 0;
  if (pageErrCount > 0 || !loopOk) {
    console.error(`\nE2E FAILED: ${pageErrCount} pages with console errors; loopOk=${loopOk}`);
    process.exit(1);
  }
  console.log('\nE2E PASSED: all pages clean; commit–reveal loop verified end-to-end.');
}

main().catch((e) => { console.error(e); process.exit(1); });
