/**
 * auction.js — auction budget calculator.
 *
 * Set a cap, build a roster (counts per slot), pick a spending strategy, and we
 * split the budget across every roster spot so it sums to EXACTLY your cap
 * ($1 minimum per spot). Pure arithmetic via splitAuctionBudget — no external
 * data, no projections. The presets are budgeting envelopes ("how much of my
 * cap to earmark"), never a claim about any player's value.
 *
 * The form is built once and only the results panel re-renders on change, so
 * number-input focus/caret is never disturbed.
 */
import { splitAuctionBudget } from '/engine/draftmath.js';
import { h, icon, copyText } from '/app/ui.js';

const root = document.getElementById('auction-app');

// Roster slot order = order the allocations come back in (slots built here).
const POSITIONS = [
  { key: 'QB', label: 'QB', def: 1 },
  { key: 'RB', label: 'RB', def: 2 },
  { key: 'WR', label: 'WR', def: 2 },
  { key: 'TE', label: 'TE', def: 1 },
  { key: 'FLEX', label: 'FLEX', def: 1 },
  { key: 'DST', label: 'DST', def: 1 },
  { key: 'K', label: 'K', def: 1 },
  { key: 'BENCH', label: 'Bench', def: 6 },
];

const PRESETS = [
  ['balanced', 'Balanced'],
  ['stars-and-scrubs', 'Stars & scrubs'],
  ['robust-rb', 'Robust RB'],
  ['hero-rb', 'Hero RB'],
  ['even', 'Even (split evenly)'],
];

const MAX_BUDGET = 100000;
const MAX_PER_SLOT = 40;

const state = {
  budget: 200,
  preset: 'balanced',
  counts: Object.fromEntries(POSITIONS.map((p) => [p.key, p.def])),
};

let resultsEl = null;

/* ---------- derived ---------- */
function buildSlots() {
  const slots = [];
  for (const p of POSITIONS) {
    const n = state.counts[p.key] || 0;
    for (let i = 0; i < n; i++) slots.push(p.key);
  }
  return slots;
}

const money = (n) => '$' + n;
const presetLabel = (key) => (PRESETS.find(([k]) => k === key) || [key, key])[1];

/* ---------- form (built once) ---------- */
function buildForm() {
  const budgetInput = h('input', {
    id: 'auc-budget', type: 'number', inputmode: 'numeric', min: '1', step: '1',
    value: String(state.budget), autocomplete: 'off', 'aria-describedby': 'auc-budget-help',
    style: 'max-width:140px',
    onInput: (e) => {
      const v = parseInt(e.target.value, 10);
      state.budget = Number.isFinite(v) ? Math.min(MAX_BUDGET, v) : NaN;
      update();
    },
  });

  const presetSelect = h('select', {
    id: 'auc-preset', style: 'width:100%',
    onChange: (e) => { state.preset = e.target.value; update(); },
  }, ...PRESETS.map(([v, l]) => {
    const o = h('option', { value: v }, l);
    if (v === state.preset) o.setAttribute('selected', 'selected');
    return o;
  }));

  const countInputs = POSITIONS.map((p) => {
    const id = 'auc-count-' + p.key;
    const input = h('input', {
      id, type: 'number', inputmode: 'numeric', min: '0', max: String(MAX_PER_SLOT), step: '1',
      value: String(state.counts[p.key]), autocomplete: 'off',
      style: 'width:100%',
      onInput: (e) => {
        let v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v) || v < 0) v = 0;
        if (v > MAX_PER_SLOT) v = MAX_PER_SLOT;
        state.counts[p.key] = v;
        update();
      },
    });
    return h('div', { class: 'field', style: 'margin:0;flex:1 1 68px;min-width:68px' },
      h('label', { for: id, class: 'small' }, p.label),
      input);
  });

  return h('form', { class: 'card stack', onSubmit: (e) => e.preventDefault() },
    h('div', { class: 'row', style: 'gap:16px;flex-wrap:wrap;align-items:flex-end' },
      h('div', { class: 'field', style: 'margin:0' },
        h('label', { for: 'auc-budget' }, icon('money'), ' Auction budget'),
        budgetInput,
        h('span', { id: 'auc-budget-help', class: 'small muted' }, 'Total cap, e.g. 200')),
      h('div', { class: 'field', style: 'margin:0;flex:1 1 200px;min-width:180px' },
        h('label', { for: 'auc-preset' }, icon('scale'), ' Strategy'),
        presetSelect)),
    h('div', { class: 'stack', style: 'gap:6px' },
      h('label', { class: 'eyebrow', style: 'margin:0' }, 'Roster spots per slot'),
      h('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px' }, ...countInputs)));
}

/* ---------- results (re-rendered on change) ---------- */
function update() {
  const slots = buildSlots();
  const rosterSize = slots.length;
  const budget = state.budget;

  let body;
  if (!Number.isInteger(budget) || budget < 1) {
    body = notice('Enter a budget of at least $1 to build a plan.');
  } else if (rosterSize === 0) {
    body = notice('Add at least one roster spot above to build a plan.');
  } else if (budget < rosterSize) {
    body = notice(
      `A $${budget} cap can’t cover ${rosterSize} roster spots — every spot needs at least $1. ` +
      'Raise the budget or trim your roster.');
  } else {
    try {
      body = planView(splitAuctionBudget({ budget, slots, preset: state.preset }));
    } catch (err) {
      body = notice('Could not build a plan: ' + ((err && err.message) || 'unknown error') + '.');
    }
  }
  resultsEl.replaceChildren(body);
}

function notice(msg) {
  return h('div', { class: 'card notice', role: 'status' },
    h('p', { style: 'margin:0' }, icon('info'), ' ', msg));
}

function planView(plan) {
  // Group the flat allocation list back into position groups (same order as slots).
  const groups = [];
  let idx = 0;
  for (const p of POSITIONS) {
    const n = state.counts[p.key] || 0;
    if (!n) continue;
    const amounts = plan.allocations.slice(idx, idx + n).map((a) => a.amount);
    idx += n;
    groups.push({ label: p.label, amounts, subtotal: amounts.reduce((a, b) => a + b, 0) });
  }
  const rosterSize = plan.allocations.length;

  const rows = groups.map((g) => {
    const lo = Math.min(...g.amounts);
    const hi = Math.max(...g.amounts);
    const each = lo === hi ? money(lo) : money(lo) + '–' + money(hi);
    return h('tr', {},
      h('th', { scope: 'row' }, g.label),
      h('td', { class: 'num' }, String(g.amounts.length)),
      h('td', { class: 'num' }, each),
      h('td', { class: 'num' }, money(g.subtotal)));
  });

  const table = h('div', { class: 'table-scroll' },
    h('table', {},
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col' }, 'Slot'),
        h('th', { scope: 'col', class: 'num' }, 'Spots'),
        h('th', { scope: 'col', class: 'num' }, 'Per spot'),
        h('th', { scope: 'col', class: 'num' }, 'Subtotal'))),
      h('tbody', {}, ...rows),
      h('tfoot', {}, h('tr', {},
        h('th', { scope: 'row' }, h('strong', {}, 'Total')),
        h('td', { class: 'num' }, h('strong', {}, String(rosterSize))),
        h('td', { class: 'num muted' }, '—'),
        h('td', { class: 'num' }, h('strong', {}, money(plan.total)))))));

  const copyBtn = h('button', { class: 'btn btn-ghost small', type: 'button',
    onClick: (e) => copyText(planText(plan, groups), e.currentTarget) }, icon('copy'), ' Copy plan');

  return h('div', { class: 'card stack' },
    h('div', { class: 'row', style: 'align-items:baseline;gap:8px;flex-wrap:wrap' },
      h('span', { class: 'badge badge-brand' }, presetLabel(plan.preset)),
      h('strong', {}, money(plan.budget) + ' across ' + rosterSize + (rosterSize === 1 ? ' spot' : ' spots'))),
    table,
    h('p', { class: 'row small', style: 'align-items:center;gap:6px;margin:0' },
      icon('scale'),
      h('span', {}, 'Sums to exactly ', h('strong', {}, money(plan.total)), ' — your full cap, $1 minimum per spot.')),
    h('div', { class: 'row' }, copyBtn),
    h('p', { class: 'muted small', style: 'margin:0' },
      'This is a spending framework — how to allocate your cap by strategy — not projections, ' +
      'rankings, or a claim about any player’s value.'));
}

function planText(plan, groups) {
  const lines = [`Auction budget plan (${presetLabel(plan.preset)}) — ${money(plan.budget)} cap, ${plan.allocations.length} spots`];
  for (const g of groups) {
    lines.push(`${g.label} (${g.amounts.length}): ${g.amounts.map(money).join(', ')} = ${money(g.subtotal)}`);
  }
  lines.push(`Total: ${money(plan.total)} (sums exactly to cap)`);
  lines.push('A spending framework, not projections. via DukeFantasy');
  return lines.join('\n');
}

/* ---------- boot ---------- */
function init() {
  resultsEl = h('div', { class: 'stack', 'aria-live': 'polite' });
  root.replaceChildren(buildForm(), resultsEl);
  update();
}

if (root) init();