/**
 * adp.js — ADP Explorer.
 *
 * Average Draft Position is MARKET DATA: where players actually go in real
 * public 12-team drafts. It is not a ranking, projection, or recommendation —
 * so every view is stamped with its scoring format, league size, draft count
 * and as-of date, and the FFC attribution is always visible.
 *
 * Pick a scoring format (Full PPR / Half-PPR / Standard), filter by position,
 * and sort any column. Pure arithmetic over the FFC feed; fixture-backed.
 */
import { parseFfcAdp, adpStamp } from '/engine/adp.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('adp-app');

const FORMATS = [
  { fmt: 'ppr', label: 'Full PPR' },
  { fmt: 'half-ppr', label: 'Half-PPR' },
  { fmt: 'standard', label: 'Standard' },
];
const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF'];

const COLUMNS = [
  { key: 'rank', label: 'Rank', num: true, get: (p) => p.rank },
  { key: 'name', label: 'Player', num: false, get: (p) => p.name },
  { key: 'position', label: 'Pos', num: false, get: (p) => p.position },
  { key: 'team', label: 'Team', num: false, get: (p) => p.team },
  { key: 'adp', label: 'ADP', num: true, get: (p) => p.adp },
  { key: 'bye', label: 'Bye', num: true, get: (p) => p.bye },
  { key: 'high', label: 'High', num: true, get: (p) => p.high },
  { key: 'low', label: 'Low', num: true, get: (p) => p.low },
];
const COL_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

const cache = new Map(); // fmt -> { result, series }
const state = { fmt: 'ppr', pos: 'ALL', sortKey: 'rank', sortDir: 1, series: null, result: null, status: 'loading', error: '' };

/* ---------- data ---------- */
async function load(fmt) {
  if (cache.has(fmt)) {
    const c = cache.get(fmt);
    state.result = c.result; state.series = c.series; state.status = 'ready'; state.error = '';
    render();
    return;
  }
  state.status = 'loading'; state.error = '';
  render();
  try {
    const result = await getFeed({ id: 'ffc_adp_' + fmt + '_12', fixture: 'ffc_adp_' + fmt + '_12_2026-07.json' });
    const series = parseFfcAdp(result.data, { fetchedAt: result.asOf });
    // Overall market rank = position when the whole board is sorted by ADP.
    series.players.slice().sort((a, b) => a.adp - b.adp).forEach((p, i) => { p.rank = i + 1; });
    cache.set(fmt, { result, series });
    if (state.fmt !== fmt) return; // user switched formats mid-flight
    state.result = result; state.series = series; state.status = 'ready';
    render();
  } catch (err) {
    if (state.fmt !== fmt) return;
    state.status = 'error'; state.error = (err && err.message) || 'Could not load ADP.';
    render();
  }
}

/* ---------- state transitions ---------- */
function setFormat(fmt) { if (fmt === state.fmt) return; state.fmt = fmt; load(fmt); }
function setPos(pos) { if (pos === state.pos) return; state.pos = pos; render(); }
function setSort(key) {
  if (state.sortKey === key) state.sortDir *= -1;
  else { state.sortKey = key; state.sortDir = 1; }
  render();
}

/* ---------- sorting ---------- */
function comparator(a, b) {
  const col = COL_BY_KEY[state.sortKey];
  const dir = state.sortDir;
  const va = col.get(a); const vb = col.get(b);
  if (col.num) {
    const an = va == null; const bn = vb == null;
    if (an && bn) return a.rank - b.rank;
    if (an) return 1;   // nulls always sort last
    if (bn) return -1;
    if (va !== vb) return (va - vb) * dir;
    return a.rank - b.rank;
  }
  const c = String(va || '').localeCompare(String(vb || ''));
  return c !== 0 ? c * dir : a.rank - b.rank;
}

/* ---------- render ---------- */
function render() {
  const prevFocus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
  const nodes = [toolHeader(), controls()];

  if (state.status === 'error') nodes.push(errorCard());
  else if (!state.series) nodes.push(loadingCard());
  else {
    nodes.push(StalenessStrip(state.result));
    nodes.push(dataHeader());
    nodes.push(tableCard());
  }
  nodes.push(sourcesFooter());

  root.replaceChildren(...nodes.filter(Boolean));

  if (prevFocus) {
    const el = root.querySelector('[data-focus="' + (window.CSS && CSS.escape ? CSS.escape(prevFocus) : prevFocus) + '"]');
    if (el) el.focus();
  }
}

function toolHeader() {
  return h('div', { class: 'tool-hero' },
    h('p', { class: 'eyebrow' }, icon('chart'), 'Average Draft Position'),
    h('h2', { style: 'margin:.2em 0' }, 'ADP Explorer'),
    h('p', { class: 'muted' },
      'Where players are actually being drafted in public 12-team leagues, by scoring format. ',
      'Sort any column, filter by position. Market data — not our ranking.'));
}

function controls() {
  return h('div', { class: 'card stack' },
    h('div', { class: 'field' },
      h('label', { id: 'adp-fmt-label' }, 'Scoring format (12-team)'),
      h('div', { class: 'row', role: 'group', 'aria-labelledby': 'adp-fmt-label' },
        ...FORMATS.map((f) => toggleBtn(f.label, state.fmt === f.fmt, () => setFormat(f.fmt), 'fmt:' + f.fmt)))),
    h('div', { class: 'field' },
      h('label', { id: 'adp-pos-label' }, 'Position'),
      h('div', { class: 'row', role: 'group', 'aria-labelledby': 'adp-pos-label' },
        ...POSITIONS.map((p) => toggleBtn(p, state.pos === p, () => setPos(p), 'pos:' + p)))));
}

function toggleBtn(label, active, onClick, focusKey) {
  return h('button', {
    type: 'button',
    class: 'btn' + (active ? ' btn-primary' : ''),
    'aria-pressed': String(active),
    dataset: { focus: focusKey },
    onClick,
  }, label);
}

function dataHeader() {
  const stamp = adpStamp(state.series);
  return h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    h('h3', { class: 'eyebrow', style: 'margin:0' }, stamp.text),
    DataAsOfStamp(String(state.result.asOf || stamp.asOf || '')));
}

function tableCard() {
  const players = state.series.players
    .filter((p) => state.pos === 'ALL' || p.position === state.pos)
    .slice()
    .sort(comparator);

  const table = h('table', {}, h('thead', {}, headerRow()), tableBody(players));
  const teams = state.series.teams || 12;
  return h('div', { class: 'card stack' },
    h('div', { class: 'table-scroll' }, table),
    h('p', { class: 'muted small' },
      players.length
        ? `${players.length} player${players.length === 1 ? '' : 's'}${state.pos === 'ALL' ? '' : ' at ' + state.pos} · ADP is where they actually go in ${teams}-team ${state.series.formatLabel} drafts.`
        : `No ${state.pos} players in this sample.`));
}

function headerRow() {
  return h('tr', {}, ...COLUMNS.map((col) => {
    const active = state.sortKey === col.key;
    const ariaSort = active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none';
    const btn = h('button', {
      type: 'button',
      class: 'btn-ghost small',
      dataset: { focus: 'sort:' + col.key },
      'aria-label': 'Sort by ' + col.label + (active ? (state.sortDir === 1 ? ', ascending' : ', descending') : ''),
      onClick: () => setSort(col.key),
    }, col.label, active ? h('span', { 'aria-hidden': 'true', text: state.sortDir === 1 ? ' ▲' : ' ▼' }) : null);
    return h('th', { scope: 'col', class: col.num ? 'num' : null, 'aria-sort': ariaSort }, btn);
  }));
}

function tableBody(players) {
  const tb = h('tbody');
  for (const p of players) {
    tb.appendChild(h('tr', {},
      h('td', { class: 'num' }, String(p.rank)),
      h('td', {}, p.name),
      h('td', {}, p.position || '—'),
      h('td', {}, p.team || '—'),
      h('td', { class: 'num' },
        p.adp.toFixed(1),
        p.adpFormatted ? h('span', { class: 'muted small', text: ' · ' + p.adpFormatted }) : null),
      h('td', { class: 'num' }, p.bye != null ? String(p.bye) : '—'),
      h('td', { class: 'num' }, p.high != null ? String(p.high) : '—'),
      h('td', { class: 'num' }, p.low != null ? String(p.low) : '—')));
  }
  return tb;
}

function loadingCard() {
  return h('div', { class: 'card', role: 'status' }, h('p', { class: 'muted', text: 'Loading ADP…' }));
}

function errorCard() {
  return h('div', { class: 'card notice' },
    h('p', {}, icon('alert'), ' Could not load ADP right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: () => load(state.fmt) }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack' },
    SourcesBlock([{ label: 'ADP data by Fantasy Football Calculator', url: 'https://fantasyfootballcalculator.com/' }]),
    h('p', { class: 'muted small' },
      'ADP (average draft position) is market behavior — the average slot at which each player is drafted across public leagues. ',
      'It is not a projection, ranking, or recommendation.'));
}

/* ---------- boot ---------- */
function init() { load(state.fmt); }
if (root) init();
