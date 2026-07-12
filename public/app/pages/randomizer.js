/**
 * randomizer.js — the flagship reveal, wired to the ritual engine.
 * State machine: setup -> committed -> revealing[i] -> complete.
 * Theatrics are deliberately minimal here (v0 builds the broadcast layer on top
 * of this exact state contract). This module owns the state + data, not the show.
 */
import { runRitual, draftPartyIcs } from '/engine/ritual.js';
import { h, icon, CommitmentBadge, copyText } from '/app/ui.js';

const root = document.getElementById('randomizer-app');
const PERMALINK_BASE = root?.dataset.permalinkBase || (location.origin + '/verify/');
let run = null;

function mount(node) { root.innerHTML = ''; root.appendChild(node); }

/* ---------- setup ---------- */
function setupView() {
  const form = h('form', { class: 'card stack' },
    h('h2', { style: 'margin-top:0' }, 'Set up your reveal'),
    field('League name (optional)', h('input', { name: 'league', placeholder: 'The League of Ordinary Gentlemen', maxlength: '80' })),
    field('Teams (one per line)', h('textarea', { name: 'teams', required: 'required', placeholder: 'Team names or manager names, one per line…', rows: '8' })),
    h('div', { class: 'row' },
      field('Reveal mode', selectEl('mode', [['suspense', 'Suspense (one at a time)'], ['instant', 'Instant (all at once)']])),
      field('Reveal direction', selectEl('direction', [['last-to-first', 'Last pick first (dramatic)'], ['first-to-last', 'First pick first']]))),
    h('p', { class: 'form-status muted small', role: 'status' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, icon('dice'), 'Lock it in & get the commitment'),
      h('a', { class: 'btn', href: '/draft-lottery/' }, 'Keeper league? Use the lottery')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const teams = form.teams.value.split('\n').map((t) => t.trim()).filter(Boolean);
    if (teams.length < 2) { status.textContent = 'Add at least 2 teams.'; return; }
    if (teams.length > 32) { status.textContent = 'Max 32 teams.'; return; }
    if (new Set(teams.map((t) => t.toLowerCase())).size !== teams.length) { status.textContent = 'Team names must be unique so the reveal is unambiguous.'; return; }
    status.textContent = 'Generating a cryptographic seed…';
    try {
      run = await runRitual({ leagueName: form.league.value.trim(), teamNames: teams, mode: form.mode.value, revealDirection: form.direction.value });
      committedView();
    } catch (err) { status.textContent = 'Something went wrong: ' + err.message; }
  });
  mount(form);
}

/* ---------- committed (commitment shown BEFORE reveal) ---------- */
function committedView() {
  const card = h('div', { class: 'card stack' },
    h('span', { class: 'badge badge-brand' }, 'Committed — locked before the reveal'),
    h('h2', { style: 'margin-top:0' }, 'Share this commitment first'),
    h('p', { class: 'muted' }, 'Post this in your league chat now. It’s the fingerprint of the secret seed. Because you can’t reverse it and everyone’s seen it, you can’t re-roll after the reveal.'),
    CommitmentBadge(run.commitment),
    run.mode === 'weighted' ? lotteryOddsTable(run.odds, run.teamNames, run.weights) : null,
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('button', { class: 'btn btn-primary btn-lg', type: 'button', onClick: () => startReveal() }, icon('trophy'), 'Reveal the order'),
      h('button', { class: 'btn btn-ghost', type: 'button', onClick: setupView }, 'Start over')));
  mount(card);
}

/* ---------- revealing ---------- */
let revealIdx = 0;
function startReveal() {
  revealIdx = 0;
  if (run.mode === 'instant') { completeView(); return; }
  revealStep();
}
function revealStep() {
  const steps = run.reveal.steps;
  const shown = steps.slice(0, revealIdx + 1);
  const stage = h('div', { class: 'card' },
    h('div', { class: 'reveal-stage' },
      h('p', { class: 'eyebrow' }, `Revealing… ${revealIdx + 1} of ${steps.length}`),
      ...shown.map((s) => h('p', { class: 'reveal-pick' },
        h('span', { class: 'reveal-slot' }, `#${s.pick} `), s.team))),
    h('div', { class: 'row' },
      revealIdx < steps.length - 1
        ? h('button', { class: 'btn btn-primary btn-lg', type: 'button', onClick: () => { revealIdx++; revealStep(); } }, 'Next pick')
        : h('button', { class: 'btn btn-primary btn-lg', type: 'button', onClick: completeView }, 'See the full board'),
      h('button', { class: 'btn btn-ghost', type: 'button', onClick: completeView }, 'Skip to results')));
  mount(stage);
}

/* ---------- complete ---------- */
function completeView() {
  const permalink = PERMALINK_BASE + '#r=' + run.permalink;
  const board = h('div', { class: 'card stack' },
    h('span', { class: 'badge badge-brand' }, 'Complete & verifiable'),
    h('h2', { style: 'margin-top:0' }, run.leagueName ? `${run.leagueName} — draft order` : 'Draft order'),
    h('div', { class: 'table-scroll' }, orderTable(run.order)),
    h('div', { class: 'stack' },
      h('label', {}, 'The seed (publish this so anyone can verify)'),
      h('code', { class: 'commitment-badge' }, run.seed)),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary', type: 'button', onClick: (e) => copyText(permalink, e.currentTarget) }, icon('share'), 'Copy verify link'),
      h('button', { class: 'btn', type: 'button', onClick: (e) => copyText(boardText(), e.currentTarget) }, icon('copy'), 'Copy board'),
      h('button', { class: 'btn', type: 'button', onClick: downloadIcs }, icon('download'), 'Draft-party invite (.ics)'),
      h('a', { class: 'btn btn-ghost', href: permalink }, icon('shieldCheck'), 'Open verifier')),
    h('p', { class: 'muted small' }, 'Nothing is stored on our servers — that link is the entire record.'),
    h('div', { class: 'row' }, h('button', { class: 'btn btn-ghost', type: 'button', onClick: setupView }, 'Run another')));
  mount(board);
}

/* ---------- pieces ---------- */
function orderTable(order) {
  const t = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Pick'), h('th', {}, 'Team'))));
  const tb = h('tbody');
  order.forEach((team, i) => tb.appendChild(h('tr', {}, h('td', { class: 'num' }, String(i + 1)), h('td', {}, team))));
  t.appendChild(tb);
  return t;
}
function lotteryOddsTable(odds, teams, weights) {
  if (!odds) return null;
  const t = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Team'), h('th', { class: 'num' }, 'Weight'), h('th', { class: 'num' }, 'P(#1 pick)'))));
  const tb = h('tbody');
  teams.map((tm, i) => ({ tm, w: weights[i], p: odds.firstPick[i] }))
    .sort((a, b) => b.p - a.p)
    .forEach(({ tm, w, p }) => tb.appendChild(h('tr', {}, h('td', {}, tm), h('td', { class: 'num' }, String(w)), h('td', { class: 'num' }, (p * 100).toFixed(1) + '%'))));
  t.appendChild(tb);
  return h('div', { class: 'stack' }, h('label', {}, 'Odds — published before the draw'), h('div', { class: 'table-scroll' }, t));
}
function boardText() {
  const head = run.leagueName ? `${run.leagueName} — draft order\n` : 'Draft order\n';
  return head + run.order.map((t, i) => `${i + 1}. ${t}`).join('\n') + `\n\nVerify: ${PERMALINK_BASE}#r=${run.permalink}`;
}
function downloadIcs() {
  const start = new Date(Date.now() + 7 * 86400000); start.setHours(19, 0, 0, 0);
  const ics = draftPartyIcs(run, { start, durationMinutes: 180, url: PERMALINK_BASE + '#r=' + run.permalink });
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'draft-party.ics'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- form helpers ---------- */
function field(label, control) { return h('div', { class: 'field' }, h('label', {}, label), control); }
function selectEl(name, opts) {
  const s = h('select', { name });
  opts.forEach(([v, l]) => s.appendChild(h('option', { value: v }, l)));
  return s;
}

if (root) setupView();
