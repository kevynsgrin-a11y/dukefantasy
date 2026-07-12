/**
 * tiers.js — Market Tiers.
 *
 * Deterministic 1-D gap clustering over FFC ADP: sort by average draft
 * position, then start a new tier wherever the gap to the next player exceeds
 * gapFactor (2.5×) the median gap. Same data in, same tiers out — no
 * randomness, no projections, no rankings, no opinion. These are MARKET tiers:
 * they describe where the crowd's drafting behavior clusters, nothing more.
 *
 * Pick a scoring format (Full PPR / Half-PPR / Standard, 12-team) and optional
 * position filter; each tier renders as its own titled card ("Tier 1 · ADP
 * 1.8–3.1") listing overall rank, player, pos·team and ADP. Fixture-backed via
 * the triple-fallback feed. StalenessStrip + FFC attribution always shown.
 */
import { parseFfcAdp, adpStamp, clusterTiers } from '/engine/adp.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('tiers-app');

const GAP_FACTOR = 2.5;
const FORMATS = [
  { fmt: 'ppr', label: 'Full PPR' },
  { fmt: 'half-ppr', label: 'Half-PPR' },
  { fmt: 'standard', label: 'Standard' },
];
const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF'];
const FFC_SOURCE = { label: 'ADP data by Fantasy Football Calculator', url: 'https://fantasyfootballcalculator.com/adp' };

const cache = new Map(); // fmt -> { result, series }
const state = { fmt: 'ppr', pos: 'ALL', series: null, result: null, status: 'loading', error: '' };

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
    // Overall market rank = slot when the WHOLE board is sorted by ADP.
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

/* ---------- render ---------- */
function render() {
  const prevFocus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
  const nodes = [toolHeader(), controls(), marketReminder()];

  if (state.status === 'error') nodes.push(errorCard());
  else if (!state.series) nodes.push(loadingCard());
  else {
    nodes.push(StalenessStrip(state.result));
    nodes.push(dataHeader());
    nodes.push(...tiersView());
  }
  nodes.push(sourcesFooter());

  root.replaceChildren(...nodes.filter(Boolean));

  if (prevFocus) {
    const sel = '[data-focus="' + (window.CSS && CSS.escape ? CSS.escape(prevFocus) : prevFocus) + '"]';
    const el = root.querySelector(sel);
    if (el) el.focus();
  }
}

function toolHeader() {
  return h('div', { class: 'tool-hero' },
    h('p', { class: 'eyebrow' }, icon('layers'), 'Market Tiers'),
    h('h2', { style: 'margin:.2em 0' }, 'Market Tiers'),
    h('p', { class: 'muted' },
      'Where the crowd’s drafting clusters, by scoring format. We sort by ADP and cut a new tier at every big gap. ',
      'Market behavior — not our ranking.'));
}

function controls() {
  return h('div', { class: 'card stack' },
    h('div', { class: 'field' },
      h('label', { id: 'tiers-fmt-label' }, 'Scoring format (12-team)'),
      h('div', { class: 'row', role: 'group', 'aria-labelledby': 'tiers-fmt-label' },
        ...FORMATS.map((f) => toggleBtn(f.label, state.fmt === f.fmt, () => setFormat(f.fmt), 'fmt:' + f.fmt)))),
    h('div', { class: 'field' },
      h('label', { id: 'tiers-pos-label' }, 'Position'),
      h('div', { class: 'row', role: 'group', 'aria-labelledby': 'tiers-pos-label' },
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

function marketReminder() {
  return h('p', { class: 'small muted', style: 'margin:0' },
    icon('info'),
    ' These are ', h('strong', {}, 'market'), ' tiers — how the crowd’s actual draft picks cluster. Not a projection, ranking, or recommendation.');
}

function dataHeader() {
  const stamp = adpStamp(state.series);
  return h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    h('h3', { class: 'eyebrow', style: 'margin:0' }, stamp.text),
    DataAsOfStamp(String(state.result.asOf || stamp.asOf || '')));
}

/* ---------- tiers ---------- */
function tiersView() {
  const players = state.series.players.filter((p) => state.pos === 'ALL' || p.position === state.pos);
  if (!players.length) {
    return [h('div', { class: 'card notice' }, `No ${state.pos} players in this sample.`)];
  }

  const clustered = clusterTiers({ ...state.series, players }, { gapFactor: GAP_FACTOR });
  const nodes = clustered.tiers.map((t) => tierCard(t));
  nodes.push(methodologyNote(clustered));
  return nodes;
}

function fmtAdp(v) { return Number.isFinite(v) ? v.toFixed(1) : '—'; }

function tierRange(t) {
  const a = fmtAdp(t.adpStart);
  const b = fmtAdp(t.adpEnd);
  return a === b ? `ADP ${a}` : `ADP ${a}–${b}`;
}

function tierCard(t) {
  const headId = 'tier-' + t.tier;
  const count = t.players.length;
  const table = h('table', { 'aria-labelledby': headId },
    h('thead', {},
      h('tr', {},
        h('th', { scope: 'col', class: 'num' }, '#'),
        h('th', { scope: 'col' }, 'Player'),
        h('th', { scope: 'col', class: 'num' }, 'ADP'))),
    tierBody(t.players));

  return h('section', { class: 'card stack', 'aria-labelledby': headId },
    h('div', { class: 'row', style: 'align-items:baseline;gap:8px;flex-wrap:wrap' },
      h('h3', { id: headId, style: 'margin:0' }, `Tier ${t.tier}`),
      h('span', { class: 'badge badge-brand' }, tierRange(t)),
      h('span', { class: 'muted small' }, `${count} player${count === 1 ? '' : 's'}`)),
    h('div', { class: 'table-scroll' }, table));
}

function tierBody(players) {
  const tb = h('tbody');
  for (const p of players) {
    const posTeam = [p.position, p.team].filter(Boolean).join(' · ') || '—';
    tb.appendChild(h('tr', {},
      h('td', { class: 'num' }, p.rank != null ? String(p.rank) : '—'),
      h('td', {},
        h('span', {}, p.name),
        h('span', { class: 'muted small', style: 'display:block' }, posTeam)),
      h('td', { class: 'num' }, fmtAdp(p.adp))));
  }
  return tb;
}

function methodologyNote(clustered) {
  const th = Number.isFinite(clustered.threshold) ? clustered.threshold.toFixed(1) : null;
  return h('p', { class: 'small muted', style: 'margin:0' },
    icon('book'),
    ` Deterministic gap clustering: a new tier starts where the ADP gap to the next player exceeds ${clustered.gapFactor}× the median gap`,
    th ? ` (threshold ≈ ${th} picks)` : '',
    '. Same data, same tiers. ',
    h('a', { href: '/methodology/#tiers', rel: 'noopener' }, 'How tiers are built'), '.');
}

/* ---------- states ---------- */
function loadingCard() {
  return h('div', { class: 'card', role: 'status' }, h('p', { class: 'muted', text: 'Loading market tiers…' }));
}

function errorCard() {
  return h('div', { class: 'card notice' },
    h('p', {}, icon('alert'), ' Could not load ADP right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: () => load(state.fmt) }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack' },
    SourcesBlock([FFC_SOURCE]),
    h('p', { class: 'muted small' },
      'ADP (average draft position) is market behavior — the average slot at which each player is drafted across public 12-team leagues. ',
      'Tiers cluster that behavior. Neither is a projection, ranking, or recommendation.'));
}

/* ---------- boot ---------- */
function init() { load(state.fmt); }
if (root) init();
