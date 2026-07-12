#!/usr/bin/env node
/**
 * verify-sources.js — operationalizes the Phase 1 pre-launch gate.
 *
 * The build/CI environment egress-blocks Sleeper / FFC / Open-Meteo, so those
 * feeds ship as `status: "unverified"` on frozen fixtures. Run THIS script from
 * any environment with open egress (your laptop, or the Cloudflare deploy step)
 * to live-verify each feed's reachability + shape, refresh the small fixtures,
 * and flip `data/sources.json` statuses to "verified".
 *
 *   node scripts/verify-sources.js            # dry run: fetch + validate + report
 *   node scripts/verify-sources.js --write     # also refresh fixtures + sources.json
 *
 * Exit code is non-zero if any shipped (open|permitted) feed fails, so it doubles
 * as a launch gate. It NEVER overwrites the curated Sleeper player sample
 * (that's a hand-built matcher corpus) — it only validates that feed's shape.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const UA = 'DukeFantasy/1.0 (+https://dukefantasy.com; hello@dukefantasy.com)';
const TODAY = new Date().toISOString().slice(0, 10);

// id -> { validate(json)->string|null (error), refreshFixture?:bool }
const CHECKS = {
  ffc_adp_ppr_12:        { refresh: true, validate: validFfc('ppr') },
  'ffc_adp_half-ppr_12': { refresh: true, validate: validFfc('half-ppr') },
  ffc_adp_standard_12:   { refresh: true, validate: validFfc('standard') },
  sleeper_state_nfl:     { refresh: true, validate: (j) => (j && j.season && j.season_type ? null : 'missing season/season_type') },
  sleeper_trending_add:  { refresh: true, wrap: (j) => ({ _meta: { source: 'live', last_verified: TODAY }, trending: j }), validate: validTrending },
  sleeper_trending_drop: { refresh: false, validate: validTrending },
  sleeper_players_nfl:   { refresh: false, validate: validPlayers }, // never overwrite the curated corpus
  open_meteo_forecast:   { refresh: true, url: meteoUrl(39.74, -105.02), validate: validMeteo,
                           wrap: (j) => ({ _meta: { source: 'live Denver sample', last_verified: TODAY }, ...j }) },
  // nflverse feeds are already verified via the raw CDN; re-check reachability.
  nflverse_games_2026:   { refresh: false, text: true, validate: (t) => (/^game_id,season,/.test(t) && t.includes(',2026,') ? null : 'no 2026 rows / bad header') },
};

function validFfc(type) {
  return (j) => {
    if (!j || j.status !== 'Success' && !Array.isArray(j.players)) return 'not an FFC payload';
    if (!Array.isArray(j.players) || j.players.length === 0) return 'no players';
    if (j.meta && j.meta.type && j.meta.type !== type) return `type mismatch: got ${j.meta.type}, want ${type}`;
    const p = j.players[0];
    if (!p.name || !p.position || !Number.isFinite(Number(p.adp))) return 'player row missing name/position/adp';
    return null;
  };
}
function validTrending(j) {
  const arr = Array.isArray(j) ? j : (j && j.trending);
  if (!Array.isArray(arr) || arr.length === 0) return 'not a trending array';
  if (arr[0].player_id == null || arr[0].count == null) return 'row missing player_id/count';
  return null;
}
function validPlayers(j) {
  if (!j || typeof j !== 'object') return 'not an object';
  const keys = Object.keys(j);
  if (keys.length < 1000) return `only ${keys.length} players (expected thousands)`;
  const sample = j[keys.find((k) => j[k] && j[k].position && j[k].position !== 'DEF')] || j[keys[0]];
  if (!sample || !sample.player_id) return 'player object missing player_id';
  if (!('espn_id' in sample) && !('gsis_id' in sample)) return 'missing cross-platform id fields';
  return null;
}
function validMeteo(j) {
  const h = j && j.hourly;
  if (!h || !Array.isArray(h.time) || !Array.isArray(h.windspeed_10m)) return 'missing hourly.time/windspeed_10m';
  if (h.time.length === 0) return 'empty forecast';
  return null;
}
function meteoUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation,precipitation_probability,windspeed_10m,windgusts_10m,weathercode` +
    `&windspeed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch&forecast_days=7&timezone=GMT`;
}

async function main() {
  const manifestPath = join(ROOT, 'data', 'sources.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const byId = Object.fromEntries(manifest.sources.map((s) => [s.id, s]));
  let failures = 0, updated = 0;

  console.log(`verify-sources ${WRITE ? '(WRITE)' : '(dry run)'} — ${TODAY}\n`);
  for (const [id, check] of Object.entries(CHECKS)) {
    const src = byId[id];
    if (!src) { console.log(`?  ${id}: not in manifest — skipped`); continue; }
    const url = check.url || src.url;
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: check.text ? 'text/plain' : 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = check.text ? await res.text() : await res.json();
      const err = check.validate(payload);
      if (err) throw new Error('shape: ' + err);

      console.log(`OK ${id}  (${src.tos})`);
      if (WRITE) {
        src.status = 'verified';
        src.last_verified = TODAY;
        if (check.refresh && src.fixture) {
          const out = check.wrap ? check.wrap(payload) : payload;
          await writeFile(join(ROOT, src.fixture), JSON.stringify(out, null, 1));
          console.log(`   ↳ refreshed ${src.fixture}`);
        }
        updated++;
      }
    } catch (e) {
      const shipped = src.tos === 'open' || src.tos === 'permitted';
      console.log(`${shipped ? 'FAIL' : 'warn'} ${id}: ${e.message}${shipped ? '  (SHIPPED FEED — blocks launch)' : ''}`);
      if (shipped) failures++;
    }
  }

  if (WRITE && updated) {
    manifest._manifest.generated = TODAY;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`\nWrote data/sources.json (${updated} feeds -> verified).`);
  }
  console.log(`\n${failures ? `GATE: ${failures} shipped feed(s) failed.` : 'GATE: all shipped feeds verified ✓'}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
