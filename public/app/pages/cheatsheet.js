/**
 * cheatsheet.js — Cheat Sheet Builder.
 *
 * Seeds an ordered board from a real ADP baseline (Full PPR, 12-team, FFC) —
 * a MARKET starting point, never our ranking. You reorder it to match your own
 * read (up/down buttons for accessibility + mobile; drag as a desktop nicety),
 * cross players off as they go, then Save (to this browser only), Load, Reset,
 * or Print for draft night. No login, no server copy — so print or save before
 * draft day. Pure arithmetic + market data; the ordering opinion is entirely
 * the drafter's own.
 */
import { parseFfcAdp, adpStamp } from '/engine/adp.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('cheatsheet-app');
const LS_KEY = 'duke-cheatsheet';

const state = {
  status: 'loading',   // loading | ready | error
  error: '',
  result: null,        // feed result
  series: null,        // parsed FFC series
  players: new Map(),  // id -> player object
  baselineOrder: [],   // ids sorted by ADP (the "reset" target)
  order: [],           // current ordered ids (the cheat sheet)
  done: new Set(),     // crossed-off ids
  notice: '',          // live status line (save/load feedback)
  focusKey: null,      // data-focus value to restore after re-render
};

const cssEsc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'));
const playerId = (p) => `${p.name}|${p.position}|${p.team}`;

/* ---------- one-time print/strikethrough CSS (static, no dynamic data) ---------- */
function ensureStyle() {
  if (document.getElementById('cs-style')) return;
  const s = document.createElement('style');
  s.id = 'cs-style';
  s.textContent = [
    '#cheatsheet-app .cs-print-head { display: none; }',
    '#cheatsheet-app tr[draggable="true"] { cursor: grab; }',
    '@media print {',
    '  #cheatsheet-app .cs-noprint,',
    '  #cheatsheet-app .cs-ctl,',
    '  #cheatsheet-app .staleness-strip,',
    '  #cheatsheet-app .sources-block { display: none !important; }',
    '  #cheatsheet-app .cs-print-head { display: block !important; }',
    '  #cheatsheet-app .table-scroll { border: 0; overflow: visible; }',
    '  #cheatsheet-app table { width: 100%; border-collapse: collapse; }',
    '  #cheatsheet-app th, #cheatsheet-app td { padding: 4px 8px; }',
    '  #cheatsheet-app .cs-done .cs-name { text-decoration: line-through; opacity: .6; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}

/* ---------- data ---------- */
async function load() {
  state.status = 'loading'; state.error = '';
  render();
  try {
    const result = await getFeed({ id: 'ffc_adp_ppr_12', fixture: 'ffc_adp_ppr_12_2026-07.json' });
    const series = parseFfcAdp(result.data, { fetchedAt: result.asOf });
    const players = new Map();
    series.players.slice().sort((a, b) => a.adp - b.adp).forEach((p) => {
      const id = playerId(p);
      if (!players.has(id)) players.set(id, { ...p, id });
    });
    state.result = result;
    state.series = series;
    state.players = players;
    state.baselineOrder = [...players.keys()];
    // Restore a saved sheet if one exists (persist across reloads); else ADP order.
    const saved = readSaved();
    if (saved) applySaved(saved); else resetToBaseline(false);
    state.status = 'ready';
    render();
  } catch (err) {
    state.status = 'error';
    state.error = (err && err.message) || 'Could not load the ADP baseline.';
    render();
  }
}

/* ---------- persistence ---------- */
function readSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && Array.isArray(o.order) ? o : null;
  } catch { return null; }
}

function applySaved(saved) {
  const known = state.players;
  const seen = new Set();
  const order = [];
  for (const id of saved.order) {
    if (known.has(id) && !seen.has(id)) { order.push(id); seen.add(id); }
  }
  // Keep any newly-added baseline players (fixture grew since the save).
  for (const id of state.baselineOrder) {
    if (!seen.has(id)) { order.push(id); seen.add(id); }
  }
  state.order = order;
  state.done = new Set((saved.done || []).filter((id) => known.has(id)));
}

function resetToBaseline(announce = true) {
  state.order = state.baselineOrder.slice();
  state.done = new Set();
  if (announce) state.notice = 'Reset to the ADP baseline order.';
}

function save() {
  state.focusKey = 'act:save';
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      order: state.order,
      done: [...state.done],
      savedAt: new Date().toISOString(),
      source: 'ffc_adp_ppr_12',
    }));
    state.notice = 'Saved to this browser. There is no login — print or Save again before draft day.';
  } catch {
    state.notice = 'Could not save — browser storage may be full or blocked.';
  }
  render();
}

function loadSaved() {
  state.focusKey = 'act:load';
  const saved = readSaved();
  if (!saved) { state.notice = 'No saved sheet found in this browser yet — Save one first.'; render(); return; }
  applySaved(saved);
  state.notice = saved.savedAt ? `Loaded your saved sheet (${formatSaved(saved.savedAt)}).` : 'Loaded your saved sheet.';
  render();
}

function formatSaved(iso) {
  try { const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleString(); } catch { return String(iso); }
}

/* ---------- reorder + cross-off ---------- */
function move(i, dir) {
  const arr = state.order;
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const id = arr[i];
  [arr[i], arr[j]] = [arr[j], arr[i]];
  state.notice = '';
  state.focusKey = 'mv:' + id + ':' + (dir < 0 ? 'up' : 'down');
  render();
}

function toggleDone(id) {
  if (state.done.has(id)) state.done.delete(id); else state.done.add(id);
  state.focusKey = 'x:' + id;
  render();
}

let dragId = null;
function onDragStart(e, id) {
  dragId = id;
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); } catch { /* ignore */ }
}
function onDragOver(e) { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch { /* ignore */ } }
function onDrop(e, targetId) {
  e.preventDefault();
  const from = state.order.indexOf(dragId);
  const to = state.order.indexOf(targetId);
  dragId = null;
  if (from < 0 || to < 0 || from === to) return;
  const [moved] = state.order.splice(from, 1);
  state.order.splice(to, 0, moved);
  state.notice = '';
  render();
}

/* ---------- render ---------- */
function render() {
  const nodes = [printHead(), toolbar(), statusLine()];
  if (state.status === 'error') nodes.push(errorCard());
  else if (state.status === 'loading' && !state.series) nodes.push(loadingCard());
  else {
    nodes.push(StalenessStrip(state.result));
    nodes.push(metaLine());
    nodes.push(listCard());
  }
  nodes.push(sourcesFooter());
  root.replaceChildren(...nodes.filter(Boolean));
  restoreFocus();
}

function restoreFocus() {
  const key = state.focusKey;
  state.focusKey = null;
  if (!key) return;
  let el = root.querySelector('[data-focus="' + cssEsc(key) + '"]');
  if ((!el || el.disabled) && key.startsWith('mv:')) {
    const alt = key.endsWith(':up') ? key.slice(0, -3) + ':down' : key.slice(0, -5) + ':up';
    const e2 = root.querySelector('[data-focus="' + cssEsc(alt) + '"]');
    if (e2 && !e2.disabled) el = e2;
  }
  if (el && !el.disabled && typeof el.focus === 'function') el.focus();
}

function toolbar() {
  const busy = state.status !== 'ready';
  const actBtn = (label, focusKey, onClick, opts = {}) => h('button', {
    type: 'button',
    class: 'btn' + (opts.primary ? ' btn-primary' : ''),
    disabled: busy ? 'disabled' : null,
    dataset: { focus: focusKey },
    onClick,
  }, opts.icon ? icon(opts.icon) : null, label);

  return h('div', { class: 'card stack cs-noprint' },
    h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
      actBtn('Save', 'act:save', save, { primary: true, icon: 'clipboard' }),
      actBtn('Load saved', 'act:load', loadSaved, { icon: 'book' }),
      actBtn('Reset to ADP', 'act:reset', () => { resetToBaseline(true); render(); }),
      actBtn('Print', 'act:print', () => window.print(), { icon: 'download' })),
    h('p', { class: 'muted small', style: 'margin:0' },
      'Reorder with the ▲▼ buttons (or drag on desktop) and cross players off as they go. ',
      'This saves only to this browser — no login — so Print or Save before draft day.'));
}

function statusLine() {
  return h('p', {
    class: 'muted small cs-noprint',
    role: 'status',
    'aria-live': 'polite',
    style: 'min-height:1.2em;margin:0',
    text: state.notice || '',
  });
}

function metaLine() {
  const stamp = adpStamp(state.series);
  return h('div', { class: 'row cs-noprint', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    h('span', { class: 'eyebrow', style: 'margin:0', text: 'Baseline: ' + stamp.text }),
    DataAsOfStamp(String(state.result.asOf || stamp.asOf || '')));
}

function printHead() {
  const stamp = state.series ? adpStamp(state.series) : null;
  const when = state.result && state.result.asOf ? ' · as of ' + state.result.asOf : '';
  return h('div', { class: 'cs-print-head' },
    h('h2', { style: 'margin:0 0 4px', text: 'My draft cheat sheet' }),
    h('p', { class: 'small', style: 'margin:0', text: (stamp ? stamp.text : 'FFC ADP baseline') + when }));
}

function listCard() {
  const table = h('table', {}, h('thead', {}, headerRow()), tableBody());
  return h('div', { class: 'card stack' },
    h('div', { class: 'table-scroll' }, table),
    h('p', { class: 'muted small cs-noprint' },
      `${state.order.length} players · ranks are YOUR order. ADP is where they actually go in 12-team ${state.series.formatLabel} drafts — a market starting point, not our ranking.`));
}

function headerRow() {
  return h('tr', {},
    h('th', { scope: 'col', class: 'num' }, '#'),
    h('th', { scope: 'col' }, 'Player'),
    h('th', { scope: 'col' }, 'Pos · Team'),
    h('th', { scope: 'col', class: 'num' }, 'ADP'),
    h('th', { scope: 'col', class: 'cs-ctl' }, 'Off'),
    h('th', { scope: 'col', class: 'cs-ctl num' }, 'Move'));
}

function tableBody() {
  const tb = h('tbody');
  const last = state.order.length - 1;
  state.order.forEach((id, i) => {
    const p = state.players.get(id);
    if (!p) return;
    const done = state.done.has(id);
    const posTeam = (p.position || '—') + (p.team ? ' · ' + p.team : '');
    const row = h('tr', {
      class: done ? 'cs-done' : null,
      draggable: 'true',
      onDragStart: (e) => onDragStart(e, id),
      onDragOver: onDragOver,
      onDrop: (e) => onDrop(e, id),
    },
      h('td', { class: 'num' }, String(i + 1)),
      h('td', {}, h('span', {
        class: 'cs-name' + (done ? ' done' : ''),
        style: done ? 'text-decoration:line-through;opacity:.6' : null,
        text: p.name,
      })),
      h('td', {}, posTeam),
      h('td', { class: 'num' },
        p.adp.toFixed(1),
        p.adpFormatted ? h('span', { class: 'muted small', text: ' · ' + p.adpFormatted }) : null),
      h('td', { class: 'cs-ctl' }, crossBtn(id, done)),
      h('td', { class: 'cs-ctl' }, moveBtns(i, id, last)));
    tb.appendChild(row);
  });
  return tb;
}

function crossBtn(id, done) {
  const name = state.players.get(id).name;
  return h('button', {
    type: 'button',
    class: 'btn btn-ghost small',
    'aria-pressed': String(done),
    'aria-label': (done ? 'Un-cross ' : 'Cross off ') + name,
    dataset: { focus: 'x:' + id },
    onClick: () => toggleDone(id),
  }, h('span', { 'aria-hidden': 'true', text: done ? 'Undo' : 'Cross off' }));
}

function moveBtns(i, id, last) {
  const name = state.players.get(id).name;
  const up = h('button', {
    type: 'button',
    class: 'btn btn-ghost small',
    'aria-label': 'Move ' + name + ' up',
    disabled: i === 0 ? 'disabled' : null,
    dataset: { focus: 'mv:' + id + ':up' },
    onClick: () => move(i, -1),
  }, h('span', { 'aria-hidden': 'true', text: '▲' }));
  const down = h('button', {
    type: 'button',
    class: 'btn btn-ghost small',
    'aria-label': 'Move ' + name + ' down',
    disabled: i === last ? 'disabled' : null,
    dataset: { focus: 'mv:' + id + ':down' },
    onClick: () => move(i, 1),
  }, h('span', { 'aria-hidden': 'true', text: '▼' }));
  return h('div', { class: 'row', style: 'gap:4px;justify-content:flex-end' }, up, down);
}

function loadingCard() {
  return h('div', { class: 'card cs-noprint', role: 'status' }, h('p', { class: 'muted', text: 'Loading the ADP baseline…' }));
}

function errorCard() {
  return h('div', { class: 'card notice cs-noprint' },
    h('p', {}, icon('alert'), ' Could not load the ADP baseline right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: load }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack cs-noprint' },
    SourcesBlock([{ label: 'ADP data by Fantasy Football Calculator', url: 'https://fantasyfootballcalculator.com/' }]),
    h('p', { class: 'muted small' },
      'ADP (average draft position) is market behavior — where players actually go in public 12-team leagues. ',
      'It seeds your sheet as a starting point; the order you build is entirely your own call, not our ranking or advice.'));
}

/* ---------- boot ---------- */
function init() { ensureStyle(); load(); }
if (root) init();
