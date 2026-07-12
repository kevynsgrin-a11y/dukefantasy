import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 8793, BASE = `http://localhost:${PORT}`;
const OUT = join(import.meta.dirname, '..', 'scratch-shots');
mkdirSync(OUT, { recursive: true });
function chrome() { const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of readdirSync(root)) if (d.startsWith('chromium-')) for (const c of ['chrome-linux/chrome','chrome-linux/headless_shell']) { const p = join(root,d,c); if (existsSync(p)) return p; } throw new Error('no chromium'); }

const server = spawn(process.execPath, [join(import.meta.dirname,'serve.js'), String(PORT)], { stdio: 'ignore' });
await new Promise((r)=>setTimeout(r,700));
const b = await chromium.launch({ executablePath: chrome(), args:['--no-sandbox'] });

async function shot(path, file, { width=1280, height=900, theme='light', steps } = {}) {
  const p = await b.newPage({ viewport:{width,height}, colorScheme: theme });
  await p.goto(BASE+path, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  if (steps) await steps(p);
  await p.screenshot({ path: join(OUT,file), fullPage: false });
  await p.close();
  console.log('shot', file);
}

await shot('/', 'home-light.png');
await shot('/', 'home-dark.png', { theme:'dark' });
await shot('/draft-order-randomizer/', 'randomizer-complete.png', { steps: async (p)=>{
  await p.fill('textarea[name=teams]', ['The Commish','Waiver Wire Warriors','Bye Week Blues','Ctrl Alt Defeat','Sofa King Good','Zero RB Zealots'].join('\n'));
  await p.selectOption('select[name=mode]','instant');
  await p.click('button[type=submit]'); await p.waitForSelector('.commitment-badge');
  await p.click('button:has-text("Reveal the order")'); await p.waitForSelector('a:has-text("Open verifier")');
}});
await shot('/adp/', 'adp.png');
await shot('/bye-weeks-2026/', 'byes.png');
await shot('/', 'home-mobile.png', { width:390, height:780 });

await b.close(); server.kill();
console.log('done ->', OUT);
