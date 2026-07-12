/**
 * adp-compare.js — side-by-side ADP across two scoring formats.
 *
 * Honesty stance: scoring format is a FIRST-CLASS LABEL, never blended. We load
 * two FFC series (fixture-backed via the triple-fallback feed), parse each, and
 * show computeDeltas() — how far a player's market ADP shifts from format A to
 * format B, plain-language framed. Both formats are labeled prominently and both
 * "as of" stamps are shown. ADP is market data (where players actually go in
 * real drafts): arithmetic + attribution only, no projections or opinions.
 */
import { parseFfcAdp, adpStamp, computeDeltas, SCORING_FORMATS } from '/engine/adp.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('adp-compare-app');

// Only the formats we ship a 12-team fixture for.
const FORMATS = ['ppr', 'half-ppr', 'standard'];
const FFC_SOURCE = { label: 'ADP data by Fantasy Football Calculator', url: 'https://fantasyfootballcalculator.com/adp' };

const state = { a: 'ppr', b: 'standard' };
const cache = new Map(); // fmt -> { result, series }

async function loadSeries(fmt) {
  if (cache.has(fmt)) return cache.get(fmt);
  const result = await getFeed({
    id: `ffc_adp_${fmt}_12`,
    fixture: `ffc_adp_${fmt}_12_2026-07.json`,
    parse: (json) => parseFfcAdp(json),
  });
  const entry = { result, series: result && result.data };
  cache.set(fmt, entry);
  return entry;
}

/* ---------- controls ---------- */
function formatSelect(which, value, onChange) {
  const sel = h('select', {
    name: `fmt-${which}`,
    'aria-label': `Format ${which.toUpperCase()}`,
    onChange: (e) => onChange(e.currentTarget.value),
  });
  FORMATS.forEach((f) => {
    const opt = h('option', { value: f }, SCORING_FORMATS[f] || f);
    if (f === value) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

/* ---------- delta badge ---------- */
function deltaBadge(delta) {
  if (delta === 0) return h('span', { class: 'chip chip-none' }, '±0');
  const later = delta > 0; // later in B => amber; earlier in B (delta<0) => green
  const color = later ? 'var(--sev-watch)' : 'var(--ok)';
  const style = `background: color-mix(in srgb, ${color} 16%, transparent); color: ${color};`;
  const sign = later ? '+' : '−';
  return h('span', {
    class: 'chip',
    style,
    title: later ? 'Goes later in format B' : 'Goes earlier in format B',
  }, `${sign}${Math.abs(delta)}`);
}

/* ---------- results ---------- */
function deltaTable(rows, labelA, labelB) {
  const thead = h('thead', {},
    h('tr', {},
      h('th', {}, 'Player'),
      h('th', {}, 'Pos'),
      h('th', {}, 'Team'),
      h('th', { class: 'num' }, h('abbr', { title: labelA }, 'ADP · A')),
      h('th', { class: 'num' }, h('abbr', { title: labelB }, 'ADP · B')),
      h('th', { class: 'num' }, 'Shift (A→B)'),
      h('th', {}, 'What the market is doing')));
  const tbody = h('tbody');
  rows.forEach((r) => {
    tbody.appendChild(h('tr', {},
      h('td', {}, r.name),
      h('td', {}, r.position),
      h('td', {}, r.team),
      h('td', { class: 'num' }, String(r.adpA)),
      h('td', { class: 'num' }, String(r.adpB)),
      h('td', { class: 'num' }, deltaBadge(r.delta)),
      h('td', { class: 'small muted' }, r.framing)));
  });
  const table = h('table', {}, thead, tbody);
  return h('div', { class: 'table-scroll' }, table);
}

function renderResults(ea, eb) {
  const nodes = [];
  const sA = ea.series;
  const sB = eb.series;

  // One combined staleness strip (both feeds share the same fixture fallback).
  nodes.push(StalenessStrip({
    stale: ea.result.stale || eb.result.stale,
    ok: ea.result.ok !== false && eb.result.ok !== false,
    notice: ea.result.notice || eb.result.notice,
  }));

  if (!sA || !sB) {
    nodes.push(h('div', { class: 'notice' },
      'ADP data is temporarily unavailable. Please try again shortly.'));
    results.replaceChildren(...nodes);
    return;
  }

  // Prominent both-format labels.
  nodes.push(h('div', { class: 'row', style: 'align-items:center' },
    h('span', { class: 'badge badge-brand' }, `A · ${sA.formatLabel}`),
    h('span', { class: 'muted small', style: 'flex:0 0 auto' }, 'vs'),
    h('span', { class: 'badge badge-accent' }, `B · ${sB.formatLabel}`),
    h('span', { class: 'muted small', style: 'flex:1 1 100%' },
      `${sA.teams || 12}-team leagues`)));

  // Both "as of" stamps.
  const stampA = adpStamp(sA);
  const stampB = adpStamp(sB);
  nodes.push(h('div', { class: 'row' },
    DataAsOfStamp(stampA.text),
    DataAsOfStamp(stampB.text)));

  if (state.a === state.b) {
    nodes.push(h('div', { class: 'notice' },
      icon('info'),
      h('span', {}, 'You picked the same format for both sides. Choose two different formats to see how the market shifts.')));
    results.replaceChildren(...nodes);
    return;
  }

  const { rows, labelA, labelB } = computeDeltas(sA, sB);

  // Legend for the delta colors.
  nodes.push(h('p', { class: 'small muted', style: 'margin:0' },
    deltaBadge(-1), ' earlier in ', h('strong', {}, labelB), ' · ',
    deltaBadge(1), ' later in ', h('strong', {}, labelB),
    ' · shift is in draft picks (market ADP only — not a ranking).'));

  if (!rows.length) {
    nodes.push(h('div', { class: 'notice' }, 'No overlapping players between these two boards.'));
  } else {
    nodes.push(deltaTable(rows, labelA, labelB));
  }

  const stampLine = ea.result.asOf || eb.result.asOf;
  if (stampLine) {
    nodes.push(h('p', { class: 'small muted', style: 'margin:0' }, `Checked ${stampLine}.`));
  }

  nodes.push(SourcesBlock([FFC_SOURCE]));

  results.replaceChildren(...nodes);
}

/* ---------- orchestration ---------- */
const results = h('div', { class: 'stack', role: 'region', 'aria-live': 'polite', 'aria-label': 'ADP comparison' });

async function refresh() {
  results.replaceChildren(h('p', { class: 'muted small' }, 'Loading market ADP…'));
  try {
    const [ea, eb] = await Promise.all([loadSeries(state.a), loadSeries(state.b)]);
    renderResults(ea, eb);
  } catch (err) {
    results.replaceChildren(h('div', { class: 'notice' },
      icon('alert'),
      h('span', {}, 'Could not load ADP data right now. Please try again shortly.')));
  }
}

function init() {
  const controls = h('div', { class: 'card stack' },
    h('p', { class: 'eyebrow', style: 'margin:0' }, 'Compare scoring formats'),
    h('div', { class: 'row' },
      h('div', { class: 'field', style: 'margin:0' },
        h('label', { for: 'fmt-a' }, 'Format A'),
        formatSelect('a', state.a, (v) => { state.a = v; refresh(); })),
      h('div', { class: 'field', style: 'margin:0' },
        h('label', { for: 'fmt-b' }, 'Format B'),
        formatSelect('b', state.b, (v) => { state.b = v; refresh(); }))),
    h('p', { class: 'small muted', style: 'margin:0' },
      'ADP is where players actually go in real drafts. We never blend formats into one number — pick two and see the gap.'));

  // Give the selects their ids so the labels bind.
  controls.querySelector('select[name="fmt-a"]').id = 'fmt-a';
  controls.querySelector('select[name="fmt-b"]').id = 'fmt-b';

  root.replaceChildren(controls, results);
  refresh();
}

if (root) init();
