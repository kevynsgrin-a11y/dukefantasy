/**
 * lottery.js — weighted draft lottery: same commit -> reveal -> complete flow
 * as the standard randomizer, but the draw is weighted by standings.
 * State machine: setup -> committed -> revealing[i] -> complete.
 * Odds are computed (and PUBLISHED) before the draw so nobody can re-roll.
 * Arithmetic + the provably-fair ritual engine only — no projections/opinions.
 */
import { runRitual, computeLotteryOdds, weightsFromStandings, draftPartyIcs } from '/engine/ritual.js';
import { h, icon, CommitmentBadge, copyText } from '/app/ui.js';

const root = document.getElementById('lottery-app');
const PERMALINK_BASE = root?.dataset.permalinkBase || (location.origin + '/verify/');
const PRESET = 'weightPreset';
let run = null;

function mount(node) { root.replaceChildren(node); }

/* ---------- setup ---------- */
function setupView() {
  const preview = h('div', { class: 'stack', dataset: { role: 'odds-preview' } });

  const form = h('form', { class: 'card stack' },
    h('h2', { style: 'margin-top:0' }, 'Set up your weighted lottery'),
    h('p', { class: 'muted' },
      'Enter your teams in STANDINGS order — worst record first, best record last. ',
      'Worse teams get more weight (better odds at the #1 pick), NBA-style.'),
    field('League name (optional)', h('input', { name: 'league', placeholder: 'The League of Ordinary Gentlemen', maxlength: '80' })),
    field('Standings — worst first, best last (one per line)',
      h('textarea', { name: 'teams', required: 'required', rows: '8', placeholder: 'Last place\n11th place\n…\n2nd place\nChampion (best odds are worst→top of this list)' })),
    field('Weighting', selectEl('preset', [
      ['linear', 'Linear — worst gets n, next n-1, … (gentle)'],
      ['steep', 'Steep — heavy tilt toward the worst teams'],
      ['flat', 'Flat — equal odds (a pure random draw)'],
    ])),
    h('div', { class: 'field' },
      h('label', {}, 'Odds preview'),
      preview),
    h('p', { class: 'form-status muted small', role: 'status' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, icon('dice'), 'Lock it in & get the commitment'),
      h('a', { class: 'btn btn-ghost', href: '/draft-order-randomizer/' }, 'Want equal odds? Standard randomizer')));

  const refresh = () => renderPreview(preview, readTeams(form), form.preset.value);
  form.teams.addEventListener('input', refresh);
  form.preset.addEventListener('change', refresh);
  refresh();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const teams = readTeams(form);
    if (teams.length < 2) { status.textContent = 'Add at least 2 teams.'; return; }
    if (teams.length > 32) { status.textContent = 'Max 32 teams.'; return; }
    if (new Set(teams.map((t) => t.toLowerCase())).size !== teams.length) {
      status.textContent = 'Team names must be unique so the reveal is unambiguous.'; return;
    }
    status.textContent = 'Generating a cryptographic seed…';
    try {
      run = await runRitual({
        leagueName: form.league.value.trim(),
        teamNames: teams,
        mode: 'weighted',
        standingsWorstFirst: teams,
        weightPreset: form.preset.value,
        revealDirection: 'last-to-first',
      });
      committedView();
    } catch (err) { status.textContent = 'Something went wrong: ' + err.message; }
  });

  mount(form);
}

function readTeams(form) {
  return form.teams.value.split('\n').map((t) => t.trim()).filter(Boolean);
}

/* Live, pre-commit odds preview — pure arithmetic from the same engine funcs. */
function renderPreview(box, teams, preset) {
  box.replaceChildren();
  if (teams.length < 2) {
    box.appendChild(h('p', { class: 'muted small' }, 'Enter at least 2 teams to see each team’s chance at the #1 pick.'));
    return;
  }
  if (teams.length > 32) {
    box.appendChild(h('p', { class: 'muted small' }, 'Max 32 teams.'));
    return;
  }
  const weights = weightsFromStandings(teams, preset);
  const odds = computeLotteryOdds(weights);
  box.appendChild(oddsTable(odds, teams, weights));
  box.appendChild(h('p', { class: 'muted small' }, 'These are exact odds for the weighted draw. They’re what gets published with the commitment.'));
}

/* ---------- committed (odds published BEFORE the reveal) ---------- */
function committedView() {
  const card = h('div', { class: 'card stack' },
    h('span', { class: 'badge badge-brand' }, 'Committed — locked before the reveal'),
    h('h2', { style: 'margin-top:0' }, 'Share this commitment first'),
    h('p', { class: 'muted' },
      'Post the commitment AND the odds table in your league chat now. The commitment is the fingerprint of the secret seed — you can’t reverse it and everyone has seen it, so you can’t re-roll after the reveal.'),
    CommitmentBadge(run.commitment),
    h('div', { class: 'stack' },
      h('label', {}, 'Odds — published before the draw'),
      oddsTable(run.odds, run.teamNames, run.weights)),
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('button', { class: 'btn btn-primary btn-lg', type: 'button', onClick: startReveal }, icon('trophy'), 'Run the draw'),
      h('button', { class: 'btn btn-ghost', type: 'button', onClick: setupView }, 'Start over')));
  mount(card);
}

/* ---------- revealing (last-to-first, one at a time) ---------- */
let revealIdx = 0;
function startReveal() { revealIdx = 0; revealStep(); }
function revealStep() {
  const steps = run.reveal.steps;
  const shown = steps.slice(0, revealIdx + 1);
  const stage = h('div', { class: 'card stack' },
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
      h('button', { class: 'btn', type: 'button', onClick: (e) => copyText(boardText(permalink), e.currentTarget) }, icon('copy'), 'Copy board'),
      h('button', { class: 'btn', type: 'button', onClick: () => downloadIcs(permalink) }, icon('download'), 'Draft-party invite (.ics)'),
      h('a', { class: 'btn btn-ghost', href: permalink }, icon('shieldCheck'), 'Open verifier')),
    h('p', { class: 'muted small' }, 'Nothing is stored on our servers — that link is the entire record: teams, weights, seed and all.'),
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

function oddsTable(odds, teams, weights) {
  const t = h('table', {},
    h('thead', {}, h('tr', {},
      h('th', {}, 'Team'),
      h('th', { class: 'num' }, 'Weight'),
      h('th', { class: 'num' }, 'P(#1 pick)'))));
  const tb = h('tbody');
  teams.map((tm, i) => ({ tm, w: weights[i], p: odds.firstPick[i] }))
    .sort((a, b) => b.p - a.p)
    .forEach(({ tm, w, p }) => tb.appendChild(h('tr', {},
      h('td', {}, tm),
      h('td', { class: 'num' }, String(w)),
      h('td', { class: 'num' }, (p * 100).toFixed(1) + '%'))));
  t.appendChild(tb);
  return h('div', { class: 'table-scroll' }, t);
}

function boardText(permalink) {
  const head = run.leagueName ? `${run.leagueName} — draft order\n` : 'Draft order\n';
  return head + run.order.map((t, i) => `${i + 1}. ${t}`).join('\n') + `\n\nVerify: ${permalink}`;
}

function downloadIcs(permalink) {
  const start = new Date(Date.now() + 7 * 86400000); start.setHours(19, 0, 0, 0);
  const ics = draftPartyIcs(run, { start, durationMinutes: 180, url: permalink });
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
