/**
 * home.js — the homepage runtime.
 *
 * Two tiny, independent jobs, both fail-silent:
 *   1) A live countdown ticker to first kickoff, driven by the pure engine
 *      getCountdown() and the ISO stamped on #countdown-hero[data-kickoff].
 *      Renders statically without JS; this just makes it tick. Stops at zero.
 *   2) Season-mode awareness: read Sleeper /state/nfl (fixture-backed), resolve
 *      the site mode, stamp it on <html data-mode> for CSS/analytics, and mark
 *      the in-season sections as active when the games are underway.
 *
 * Arithmetic + market data only. No projections, no opinions.
 */
import { getCountdown } from '/engine/schedule.js';
import { getSeasonMode } from '/engine/seasonmode.js';
import { getFeed } from '/app/feed.js';

const PARTS = ['days', 'hours', 'minutes', 'seconds'];

function startCountdown(hero) {
  const target = new Date(hero.dataset.kickoff || '');
  if (Number.isNaN(target.getTime())) return; // bad/missing ISO — leave static markup

  // Cache the four number cells once.
  const cells = {};
  for (const p of PARTS) cells[p] = hero.querySelector(`[data-cd="${p}"]`);

  let timer = null;
  const tick = () => {
    const cd = getCountdown(new Date(), target);
    for (const p of PARTS) {
      const el = cells[p];
      if (el) el.textContent = String(cd[p]);
    }
    if (cd.past || cd.totalMs <= 0) {
      if (timer) { clearInterval(timer); timer = null; }
    }
  };

  tick(); // paint immediately so we never show the "—" placeholder once JS runs
  timer = setInterval(tick, 1000);
}

async function applySeasonMode() {
  try {
    const result = await getFeed({ id: 'sleeper_state_nfl', fixture: 'sleeper_state_2026-07.json' });
    const { mode } = getSeasonMode(result && result.data, { now: new Date() });
    if (!mode) return;
    document.documentElement.dataset.mode = mode;
    if (mode === 'in-season') {
      // Sections are shown by default; mark them active for CSS/analytics emphasis.
      for (const section of document.querySelectorAll('[data-inseason-hidden]')) {
        section.dataset.inseasonActive = 'true';
      }
    }
  } catch {
    /* fail silent — the static homepage stands on its own */
  }
}

function init() {
  const hero = document.getElementById('countdown-hero');
  if (hero) startCountdown(hero);
  applySeasonMode();
}

init();
