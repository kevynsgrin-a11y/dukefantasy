/**
 * waiver.js — Waiver Radar.
 *
 * MARKET MOVEMENT, not advice. This is the volume of adds across Sleeper
 * leagues in the last 24 hours, joined through the canonical player registry
 * so names, teams and positions are correct. A player near the top is being
 * grabbed a lot — that's a signal about what the market is doing, NOT a
 * start/sit call. Pure arithmetic over the Sleeper trending feed; the
 * disclaimer stays prominent and anything we can't resolve is surfaced.
 */
import { buildTrendingBoard } from '/engine/trending.js';
import { buildRegistry } from '/engine/identity.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('waiver-app');

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF'];

const state = {
  registry: null,
  trending: null, // raw trending array
  result: null,   // trending feed result (for staleness + sourcing)
  board: null,
  pos: 'ALL',
  status: 'loading',
  error: '',
};

/* ---------- data ---------- */
function rebuild() {
  state.board = buildTrendingBoard(state.trending, state.registry, {
    direction: 'add',
    position: state.pos === 'ALL' ? undefined : state.pos,
    now: new Date(),
  });
}

async function load() {
  state.status = 'loading'; state.error = '';
  render();
  try {
    const [players, trending] = await Promise.all([
      getFeed({ id: 'sleeper_players_nfl', fixture: 'sleeper_players_sample.json' }),
      getFeed({ id: 'sleeper_trending_add', fixture: 'sleeper_trending_add_2026-07.json' }),
    ]);
    state.registry = buildRegistry(players.data);
    state.trending = trending.data && trending.data.trending ? trending.data.trending : trending.data;
    state.result = trending;
    rebuild();
    state.status = 'ready';
    render();
  } catch (err) {
    state.status = 'error';
    state.error = (err && err.message) || 'Could not load the waiver radar.';
    render();
  }
}

/* ---------- state transitions ---------- */
function setPos(pos) {
  if (pos === state.pos) return;
  state.pos = pos;
  rebuild();
  render();
}

/* ---------- render ---------- */
function render() {
  const prevFocus = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.focus : null;

  const nodes = [];
  if (state.status === 'error') {
    nodes.push(errorCard());
  } else if (state.status === 'loading' || !state.board) {
    nodes.push(loadingCard());
  } else {
    nodes.push(StalenessStrip(state.result));
    nodes.push(disclaimerCard());
    nodes.push(controls());
    nodes.push(tableCard());
    nodes.push(unresolvedCard());
  }
  nodes.push(sourcesFooter());

  root.replaceChildren(...nodes.filter(Boolean));

  if (prevFocus) {
    const sel = '[data-focus="' + (window.CSS && CSS.escape ? CSS.escape(prevFocus) : prevFocus) + '"]';
    const el = root.querySelector(sel);
    if (el) el.focus();
  }
}

function disclaimerCard() {
  const b = state.board;
  return h('div', { class: 'card stack' },
    h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
      h('p', { class: 'eyebrow', style: 'margin:0' }, icon('trending'), b.headline),
      DataAsOfStamp(String(b.asOf || ''))),
    h('p', { class: 'notice', role: 'note', style: 'margin:0' },
      icon('info'), ' ', h('strong', {}, 'Market movement, not a start/sit call.'),
      ' ', b.disclaimer),
    h('p', { class: 'muted small', style: 'margin:0' }, b.attribution));
}

function controls() {
  return h('div', { class: 'card' },
    h('div', { class: 'field' },
      h('label', { id: 'waiver-pos-label' }, 'Position'),
      h('div', { class: 'row', role: 'group', 'aria-labelledby': 'waiver-pos-label' },
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

function tableCard() {
  const rows = state.board.rows;
  const posLabel = state.pos === 'ALL' ? '' : ' at ' + state.pos;

  if (!rows.length) {
    return h('div', { class: 'card', role: 'status' },
      h('p', { class: 'muted', text: 'No trending adds' + posLabel + ' in this window.' }));
  }

  const table = h('table', {},
    h('caption', { class: 'small muted', style: 'text-align:left;padding-bottom:8px' },
      'Most-added players' + posLabel + ' across Sleeper leagues, last ' + state.board.lookbackHours + 'h.'),
    h('thead', {},
      h('tr', {},
        h('th', { scope: 'col', class: 'num' }, '#'),
        h('th', { scope: 'col' }, 'Player'),
        h('th', { scope: 'col' }, 'Pos'),
        h('th', { scope: 'col' }, 'Team'),
        h('th', { scope: 'col', class: 'num' }, 'Adds (24h)'))),
    tableBody(rows));

  return h('div', { class: 'card stack' },
    h('div', { class: 'table-scroll' }, table),
    h('p', { class: 'muted small' },
      rows.length + ' player' + (rows.length === 1 ? '' : 's') +
      ' · counts are add transactions across public Sleeper leagues, not a recommendation.'));
}

function tableBody(rows) {
  const tb = h('tbody');
  rows.forEach((r, i) => {
    tb.appendChild(h('tr', {},
      h('td', { class: 'num' }, String(i + 1)),
      h('th', { scope: 'row', style: 'font-weight:600' }, r.name || '—'),
      h('td', {}, r.position || '—'),
      h('td', {}, r.team || 'FA'),
      h('td', { class: 'num' }, formatCount(r.count))));
  });
  return tb;
}

function formatCount(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US');
}

function unresolvedCard() {
  const n = state.board.stats && state.board.stats.unresolved;
  if (!n) return null;
  return h('div', { class: 'card', style: 'padding:12px 16px' },
    h('p', { class: 'muted small', style: 'margin:0' },
      icon('alert'), ' ',
      n + ' trending ' + (n === 1 ? 'entry' : 'entries') +
      " couldn't be matched to a known player and " +
      (n === 1 ? 'is' : 'are') + ' held out of the board rather than guessed.'));
}

function loadingCard() {
  return h('div', { class: 'card', role: 'status' },
    h('p', { class: 'muted', text: 'Loading the waiver radar…' }));
}

function errorCard() {
  return h('div', { class: 'card notice' },
    h('p', {}, icon('alert'), ' Could not load the waiver radar right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: () => load() }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack' },
    SourcesBlock([{ label: 'Player data & trending by Sleeper', url: 'https://sleeper.com/' }]),
    h('p', { class: 'muted small' },
      'Trending data provided by Sleeper. The radar counts add transactions across public leagues over the last 24 hours — ',
      'descriptive market movement, not a projection, ranking, or start/sit recommendation.'));
}

/* ---------- boot ---------- */
function init() { load(); }
if (root) init();
