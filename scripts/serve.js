#!/usr/bin/env node
/**
 * Minimal static server for local preview + e2e — mirrors Cloudflare Pages
 * clean-URL routing (/adp/ -> adp/index.html) and serves the built public/ dir.
 * Not for production (Pages serves the real thing); this is a test harness.
 *
 * Usage: node scripts/serve.js [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.argv[2]) || 8788;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar',
};

async function resolve(pathname) {
  let p = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(PUB, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    if (!extname(file)) file = join(PUB, p, 'index.html'); // clean URL
  }
  return file;
}

const server = createServer(async (req, res) => {
  try {
    let file = await resolve(req.url.split('?')[0]);
    let body;
    try { body = await readFile(file); }
    catch { file = join(PUB, '404.html'); body = await readFile(file); res.statusCode = 404; }
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch (err) {
    res.statusCode = 500; res.end('server error: ' + err.message);
  }
});
server.listen(PORT, () => console.log(`[serve] http://localhost:${PORT} -> ${PUB}`));
