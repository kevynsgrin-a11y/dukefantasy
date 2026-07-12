/**
 * snake.js — Snake draft pick calculator. Pure arithmetic from draftmath.js:
 * "when do I pick?" for any league size, slot, round count, and snake variant.
 * No external data, no projections. Live-updating and shareable via URL params.
 */
import { getSnakePicks, getSnakeBoard, SNAKE_VARIANTS } from '/engine/draftmath.js';
import { h, icon, copyText } from '/app/ui.js';

const root = document.getElementById('snake-app');

const VARIANT_LABELS = {
  snake: 'Standard snake',
  '3rr': 'Third-round reversal (3RR)',
  linear: 'Linear (same order each round)',
};

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/* ---------- state, seeded from URL ---------- */
const params = new URLSearchParams(location.search);
const state = {
  teams: clampInt(params.get('teams'), 2, 32, 12),
  rounds: clampInt(params.get('rounds'), 1, 30, 15),
  slot: 6,
  variant: SNAKE_VARIANTS.includes(params.get('variant')) ? params.get('variant') : 'snake',
  showBoard: params.get('board') === '1',
};
state.slot = clampInt(params.get('slot'), 1, state.teams, Math.min(6, state.teams));

function syncUrl() {
  const p = new URLSearchParams();
  p.set('teams', String(state.teams));
  p.set('slot', String(state.slot));
  p.set('rounds', String(state.rounds));
  p.set('variant', state.variant);
  if (state.showBoard) p.set('board', '1');
  history.replaceState(null, '', location.pathname + '?' + p.toString());
}

/* ---------- form pieces ---------- */
function field(labelText, control) {
  return h('div', { class: 'field' }, h('label', { for: control.id }, labelText), control);
}

const teamsInput = h('input', { type: 'number', id: 'sd-teams', min: '2', max: '32', step: '1', inputmode: 'numeric', value: String(state.teams) });
const slotInput = h('input', { type: 'number', id: 'sd-slot', min: '1', max: String(state.teams), step: '1', inputmode: 'numeric', value: String(state.slot) });
const roundsInput = h('input', { type: 'number', id: 'sd-rounds', min: '1', max: '30', step: '1', inputmode: 'numeric', value: String(state.rounds) });
const variantSelect = h('select', { id: 'sd-variant' }, ...SNAKE_VARIANTS.map((v) => h('option', { value: v }, VARIANT_LABELS[v])));
variantSelect.value = state.variant;

const resultBox = h('div', { class: 'stack', 'aria-live': 'polite' });

const toggleBtn = h('button', {
  class: 'btn btn-ghost', type: 'button', 'aria-expanded': String(state.showBoard),
  onClick: () => {
    state.showBoard = !state.showBoard;
    toggleBtn.setAttribute('aria-expanded', String(state.showBoard));
    toggleBtn.querySelector('.sd-toggle-label').textContent = state.showBoard ? 'Hide full board' : 'Show full board';
    syncUrl();
    renderResults();
  },
}, icon('grid'), h('span', { class: 'sd-toggle-label' }, state.showBoard ? 'Hide full board' : 'Show full board'));

/* ---------- read + reflect + recompute ---------- */
function readState() {
  state.teams = clampInt(teamsInput.value, 2, 32, state.teams);
  state.rounds = clampInt(roundsInput.value, 1, 30, state.rounds);
  state.slot = clampInt(slotInput.value, 1, state.teams, Math.min(state.slot, state.teams));
  state.variant = SNAKE_VARIANTS.includes(variantSelect.value) ? variantSelect.value : 'snake';
  slotInput.max = String(state.teams);
}
function reflect() {
  teamsInput.value = String(state.teams);
  slotInput.value = String(state.slot);
  roundsInput.value = String(state.rounds);
  variantSelect.value = state.variant;
}
// live: recompute while typing without fighting the caret
function onInput() { readState(); syncUrl(); renderResults(); }
// commit: on blur/change, clamp the visible fields to legal values
function onChange() { readState(); reflect(); syncUrl(); renderResults(); }

/* ---------- results ---------- */
function renderResults() {
  const picks = getSnakePicks({ teams: state.teams, slot: state.slot, rounds: state.rounds, variant: state.variant });
  resultBox.textContent = '';

  resultBox.appendChild(h('p', { class: 'sd-summary', style: 'margin:0;font-size:1.05rem' },
    h('strong', {}, `You pick at ${picks.join(', ')}.`)));
  resultBox.appendChild(h('p', { class: 'muted small', style: 'margin:.25rem 0 0' },
    `Slot ${state.slot} of ${state.teams} · ${picks.length} pick${picks.length === 1 ? '' : 's'} · ${VARIANT_LABELS[state.variant]}`));

  resultBox.appendChild(h('div', { class: 'row', role: 'list', style: 'flex-wrap:wrap;gap:.4rem;margin-top:.25rem' },
    ...picks.map((ov, i) => h('span', { class: 'chip', role: 'listitem' },
      h('span', { class: 'small muted' }, 'R' + (i + 1) + ' '),
      h('strong', { class: 'num' }, String(ov))))));

  if (state.showBoard) resultBox.appendChild(boardTable());
}

function boardTable() {
  const { board } = getSnakeBoard({ teams: state.teams, rounds: state.rounds, variant: state.variant });
  const head = [h('th', { scope: 'col', class: 'num' }, 'Rnd')];
  for (let s = 1; s <= state.teams; s++) {
    head.push(h('th', { scope: 'col', class: 'num' },
      s === state.slot
        ? h('span', {}, String(s), ' ', h('span', { class: 'badge badge-brand' }, 'You'))
        : String(s)));
  }
  const tbody = h('tbody');
  board.forEach((row) => {
    const bySlot = {};
    row.forEach((c) => { bySlot[c.slot] = c.overall; });
    const cells = [h('th', { scope: 'row', class: 'num' }, String(row[0].round))];
    for (let s = 1; s <= state.teams; s++) {
      const ov = bySlot[s];
      cells.push(h('td', { class: 'num' },
        s === state.slot ? h('span', { class: 'badge badge-brand' }, String(ov)) : String(ov)));
    }
    tbody.appendChild(h('tr', {}, ...cells));
  });
  const table = h('table', {},
    h('caption', { class: 'muted small', style: 'text-align:left;padding-bottom:.35rem' },
      `Full board — ${state.teams} teams × ${state.rounds} rounds (${VARIANT_LABELS[state.variant]}). Column ${state.slot} is yours.`),
    h('thead', {}, h('tr', {}, ...head)),
    tbody);
  return h('div', { class: 'table-scroll', style: 'margin-top:.5rem' }, table);
}

/* ---------- copy helpers ---------- */
function copyLink(e) {
  readState(); reflect(); syncUrl();
  copyText(location.href, e.currentTarget);
}
function copyPicks(e) {
  const picks = getSnakePicks({ teams: state.teams, slot: state.slot, rounds: state.rounds, variant: state.variant });
  const text = `Snake draft — slot ${state.slot} of ${state.teams} (${VARIANT_LABELS[state.variant]})\nMy picks: ${picks.join(', ')}`;
  copyText(text, e.currentTarget);
}

/* ---------- mount ---------- */
function init() {
  root.textContent = '';

  teamsInput.addEventListener('input', onInput);
  slotInput.addEventListener('input', onInput);
  roundsInput.addEventListener('input', onInput);
  teamsInput.addEventListener('change', onChange);
  slotInput.addEventListener('change', onChange);
  roundsInput.addEventListener('change', onChange);
  variantSelect.addEventListener('change', onChange);

  const hero = h('div', { class: 'card tool-hero stack' },
    h('p', { class: 'eyebrow' }, icon('dice'), 'Snake pick calculator'),
    h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.75rem;align-items:flex-end' },
      field('Teams', teamsInput),
      field('Your draft slot', slotInput),
      field('Rounds', roundsInput),
      field('Draft type', variantSelect)),
    resultBox,
    h('div', { class: 'row', style: 'flex-wrap:wrap;gap:.5rem;margin-top:.25rem' },
      toggleBtn,
      h('button', { class: 'btn', type: 'button', onClick: copyLink }, icon('share'), 'Copy link'),
      h('button', { class: 'btn', type: 'button', onClick: copyPicks }, icon('copy'), 'Copy my picks')));

  const explainer = h('div', { class: 'card explainer stack' },
    h('h2', { style: 'margin:0 0 .25rem' }, 'How the numbers work'),
    h('ul', { class: 'small', style: 'margin:0;padding-left:1.1rem' },
      h('li', {}, h('strong', {}, 'Standard snake'), ' — order reverses every round (1→N, then N→1), so late slots get back-to-back picks at each turn.'),
      h('li', {}, h('strong', {}, 'Third-round reversal (3RR)'), ' — round 3 repeats round 2’s reversed order to soften the 1.01 owner’s advantage; normal snaking resumes after.'),
      h('li', {}, h('strong', {}, 'Linear'), ' — same order every round, no reversal.')),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Pure arithmetic — change any input and every pick recalculates instantly. The link above encodes your setup so you can share it.'));

  root.appendChild(hero);
  root.appendChild(explainer);

  syncUrl();
  renderResults();
}

if (root) init();
