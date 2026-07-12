/**
 * countdown.js — draft countdown + one-click calendar invite.
 *
 * Two pure-arithmetic jobs, no projections or opinions:
 *   1) A live clock (getCountdown) ticking every second toward a target. The
 *      default target is the season kickoff baked into the mount as data-kickoff
 *      (verified from the nflverse schedule) — kept as the fallback.
 *   2) Let the manager set their OWN draft date/time + league name. The clock
 *      switches to that target and an "Add to calendar (.ics)" button downloads
 *      a real RFC-5545 file via buildIcs.
 *
 * The DOM shell is built once; only the number nodes, labels and status line are
 * updated on each tick, so the input focus and typed values are never disturbed.
 */
import { getCountdown } from '/engine/schedule.js';
import { buildIcs } from '/engine/util/ics.js';
import { h, icon, SourcesBlock } from '/app/ui.js';

const root = document.getElementById('countdown-app');

const kickoffLabel = (root && root.dataset.kickoffLabel) || 'Season kickoff';
const kickoffDate = parseDate(root && root.dataset.kickoff);

const state = {
  league: '',
  customDate: null, // Date | null (from the datetime-local input)
};

/* ---------- shared element refs (built once, mutated on tick) ---------- */
const modeBadge = h('span', { class: 'badge badge-brand', text: 'NFL kickoff' });
const targetLabelEl = h('strong', { style: 'font-size:1.05rem' });

function unit(labelText) {
  const n = h('div', { class: 'n', text: '0' });
  const wrap = h('div', { class: 'unit', 'aria-hidden': 'true' }, n, h('div', { class: 'l', text: labelText }));
  return { wrap, n };
}
const uDays = unit('Days');
const uHours = unit('Hours');
const uMins = unit('Minutes');
const uSecs = unit('Seconds');

const countdownEl = h('div', { class: 'countdown', role: 'timer', 'aria-label': '' },
  uDays.wrap, uHours.wrap, uMins.wrap, uSecs.wrap);

const statusEl = h('p', { class: 'notice', role: 'status', style: 'margin:0;display:none' });

const dateInput = h('input', {
  id: 'cd-datetime', type: 'datetime-local', 'aria-describedby': 'cd-date-help', onInput: onDateInput,
});
const leagueInput = h('input', {
  id: 'cd-league', type: 'text', maxlength: '80', autocomplete: 'off', placeholder: 'e.g. Dynasty Degens',
  onInput: (e) => { state.league = e.target.value; refreshTarget(); tick(); },
});

/* ---------- target helpers ---------- */
function activeTarget() { return state.customDate || kickoffDate; }
function leagueName() { return state.league.trim(); }
function activeLabel() {
  if (state.customDate) return (leagueName() ? leagueName() + ' · ' : '') + formatLocal(state.customDate);
  return kickoffDate ? kickoffLabel : 'No date set yet';
}

function refreshTarget() {
  const custom = !!state.customDate;
  modeBadge.className = 'badge ' + (custom ? 'badge-accent' : 'badge-brand');
  modeBadge.textContent = custom ? 'Your draft' : 'NFL kickoff';
  targetLabelEl.textContent = activeLabel();
}

/* ---------- the live tick ---------- */
function tick() {
  const target = activeTarget();
  if (!target) {
    uDays.n.textContent = '0'; uHours.n.textContent = '00'; uMins.n.textContent = '00'; uSecs.n.textContent = '00';
    countdownEl.setAttribute('aria-label', 'Set a draft date below to start the countdown.');
    setStatus('Add a draft date and time below to start the countdown.');
    return;
  }
  const c = getCountdown(new Date(), target);
  uDays.n.textContent = String(c.days);
  uHours.n.textContent = pad2(c.hours);
  uMins.n.textContent = pad2(c.minutes);
  uSecs.n.textContent = pad2(c.seconds);

  const label = activeLabel();
  if (c.past) {
    countdownEl.setAttribute('aria-label', label + ' has arrived.');
    setStatus((state.customDate ? 'It’s draft day' : 'Kickoff is here') + ' — ' + label + '. Good luck!');
  } else {
    countdownEl.setAttribute('aria-label',
      `${c.days} days, ${c.hours} hours, ${c.minutes} minutes, ${c.seconds} seconds until ${label}.`);
    setStatus('');
  }
}

function setStatus(msg) {
  if (msg) { statusEl.textContent = msg; statusEl.style.display = ''; }
  else { statusEl.textContent = ''; statusEl.style.display = 'none'; }
}

/* ---------- input + action handlers ---------- */
function onDateInput(e) {
  const v = e.target.value;
  const d = v ? new Date(v) : null;
  state.customDate = d && !Number.isNaN(d.getTime()) ? d : null;
  refreshTarget();
  tick();
}

function resetToKickoff() {
  state.customDate = null;
  dateInput.value = '';
  refreshTarget();
  tick();
}

function downloadIcs() {
  const start = activeTarget();
  if (!start) { setStatus('Add a draft date first to build a calendar invite.'); return; }
  const name = leagueName();
  const title = (name ? name + ' ' : '') + 'Fantasy Draft';
  const usingKickoff = !state.customDate;
  const ics = buildIcs({
    title,
    start,
    durationMinutes: 180,
    description: usingKickoff
      ? 'Fantasy football draft (defaulted to the 2026 season kickoff — set your own time on DukeFantasy).'
      : 'Fantasy football draft. Built with the DukeFantasy draft countdown.',
    url: location.href,
  });
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (slug(name) || 'fantasy') + '-draft.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- small pure utils ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatLocal(d) {
  try {
    return d.toLocaleString(undefined,
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return d.toISOString(); }
}
function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ---------- boot ---------- */
function init() {
  const header = h('div', { class: 'stack', style: 'gap:6px' },
    h('div', { class: 'row', style: 'align-items:center;gap:8px;flex-wrap:wrap' },
      h('span', { class: 'eyebrow' }, 'Counting down to'), modeBadge),
    targetLabelEl);

  const formCard = h('div', { class: 'card stack' },
    h('h2', { style: 'margin:0;font-size:1.15rem' }, icon('calendar'), ' Count down to your own draft'),
    h('div', { class: 'field' },
      h('label', { for: 'cd-league' }, 'League name (optional)'),
      leagueInput),
    h('div', { class: 'field' },
      h('label', { for: 'cd-datetime' }, 'Draft date & time'),
      dateInput,
      h('p', { class: 'muted small', id: 'cd-date-help', style: 'margin:4px 0 0' },
        'Uses your local time zone. Leave it blank to keep counting down to kickoff.')),
    h('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px' },
      h('button', { class: 'btn btn-primary', type: 'button', onClick: downloadIcs },
        icon('download'), ' Add to calendar (.ics)'),
      h('button', { class: 'btn btn-ghost', type: 'button', onClick: resetToKickoff },
        icon('clock'), ' Reset to kickoff')));

  const provenance = h('div', { class: 'stack', style: 'gap:8px' },
    h('p', { class: 'muted small', style: 'margin:0' },
      'Kickoff is the first game of the 2026 season, verified from the nflverse schedule. Everything here is arithmetic — a live clock and a calendar file. No projections, rankings, or advice.'),
    SourcesBlock([{ label: 'Schedule data via nflverse', url: 'https://github.com/nflverse' }]));

  root.replaceChildren(
    h('div', { class: 'stack' }, header, countdownEl, statusEl),
    formCard,
    provenance);

  refreshTarget();
  tick();
  setInterval(tick, 1000);
}

if (root) init();
