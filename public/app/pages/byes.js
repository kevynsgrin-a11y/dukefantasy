/**
 * byes.js — 2026 NFL bye weeks + roster bye-conflict checker.
 *
 * Everything here is derived straight from the nflverse schedule feed — no
 * hand-typed bye tables, no opinions. Three pure-arithmetic tools:
 *   1) Quick lookup — "what week is TEAM's bye?" (getByeWeeks).
 *   2) Conflict checker — tap your teams (or paste codes) and we flag the
 *      weeks where two or more of them are off at once (checkByeConflicts).
 *   3) The full bye grid, Weeks 5–14 (getByeGrid).
 *
 * A bye conflict is a counting fact — the number of your teams resting in a
 * given week — not advice about who to draft. Fixture-backed via getFeed.
 */
import { parseSchedule, getByeGrid, getByeWeeks, checkByeConflicts } from '/engine/schedule.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('byes-app');

const GRID_WEEKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const state = {
  status: 'loading',   // 'loading' | 'ready' | 'error'
  error: '',
  result: null,        // feed result
  schedule: null,
  byeWeeks: null,      // { TEAM: week }
  byeGrid: null,       // { week: [teams] }
  teams: [],           // sorted team codes
  selected: new Set(), // roster team codes
  lookup: '',          // quick-lookup team code
  unresolvedInput: [], // codes pasted that we couldn't match
};

/* ---------- data ---------- */
async function load() {
  state.status = 'loading';
  state.error = '';
  render();
  try {
    const result = await getFeed({ id: 'nflverse_games_2026', fixture: 'nflverse_schedule_2026.json' });
    const schedule = parseSchedule(result.data);
    state.result = result;
    state.schedule = schedule;
    state.byeWeeks = getByeWeeks(schedule);
    state.byeGrid = getByeGrid(schedule);
    state.teams = (schedule.teams || []).slice().sort();
    state.status = 'ready';
    render();
  } catch (err) {
    state.status = 'error';
    state.error = (err && err.message) || 'Could not load the schedule.';
    render();
  }
}

/* ---------- helpers ---------- */
function byeOf(team) {
  const wk = state.byeWeeks ? state.byeWeeks[team] : null;
  if (wk == null) return null;
  return Array.isArray(wk) ? wk[0] : wk;
}

function toggleTeam(code) {
  if (state.selected.has(code)) state.selected.delete(code);
  else state.selected.add(code);
  state.unresolvedInput = [];
  render();
}

function addFromText(raw) {
  const codes = String(raw || '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const unresolved = [];
  for (const c of codes) {
    if (state.byeWeeks && Object.prototype.hasOwnProperty.call(state.byeWeeks, c)) state.selected.add(c);
    else if (!unresolved.includes(c)) unresolved.push(c);
  }
  state.unresolvedInput = unresolved;
  render();
}

function clearRoster() {
  state.selected.clear();
  state.unresolvedInput = [];
  render();
}

/* ---------- render ---------- */
function render() {
  const prevFocus = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.focus : null;

  const nodes = [];
  if (state.status === 'error') {
    nodes.push(errorCard());
  } else if (state.status === 'loading' && !state.schedule) {
    nodes.push(loadingCard());
  } else {
    nodes.push(StalenessStrip(state.result));
    nodes.push(lookupCard());
    nodes.push(checkerCard());
    nodes.push(gridCard());
  }
  nodes.push(sourcesFooter());

  root.replaceChildren(...nodes.filter(Boolean));

  if (prevFocus) {
    const sel = window.CSS && CSS.escape ? CSS.escape(prevFocus) : prevFocus;
    const el = root.querySelector('[data-focus="' + sel + '"]');
    if (el) el.focus();
  }
}

/* ---- 1) quick lookup ---- */
function lookupCard() {
  const wk = state.lookup ? byeOf(state.lookup) : null;
  const select = h('select', {
    id: 'bye-lookup',
    dataset: { focus: 'lookup' },
    onChange: (e) => { state.lookup = e.target.value; render(); },
  },
    h('option', { value: '' }, 'Choose a team…'),
    ...state.teams.map((t) => {
      const o = h('option', { value: t }, t);
      if (t === state.lookup) o.setAttribute('selected', 'selected');
      return o;
    }));

  return h('div', { class: 'card stack' },
    h('div', { class: 'field' },
      h('label', { for: 'bye-lookup' }, icon('calendar'), ' What week is a team’s bye?'),
      select),
    state.lookup
      ? h('p', { role: 'status', style: 'margin:0;font-size:1.05rem' },
          h('strong', {}, state.lookup),
          wk != null
            ? h('span', {}, ' is on bye in ', h('span', { class: 'badge badge-brand' }, 'Week ' + wk), '.')
            : h('span', { class: 'muted' }, ' has no single bye week in this data.'))
      : h('p', { class: 'muted small', style: 'margin:0' }, 'Pick a team to see its 2026 bye week.'));
}

/* ---- 2) conflict checker ---- */
function checkerCard() {
  const roster = [...state.selected];
  const report = checkByeConflicts(state.schedule, roster);

  const chips = h('div', { class: 'row', role: 'group', 'aria-label': 'Add your teams', style: 'flex-wrap:wrap;gap:6px' },
    ...state.teams.map((t) => {
      const active = state.selected.has(t);
      return h('button', {
        type: 'button',
        class: 'btn small' + (active ? ' btn-primary' : ''),
        'aria-pressed': String(active),
        'aria-label': t + (active ? ', in roster' : ', add to roster'),
        dataset: { focus: 'team:' + t },
        style: 'min-width:52px',
        onClick: () => toggleTeam(t),
      }, t);
    }));

  const pasteForm = h('form', {
    class: 'row',
    style: 'gap:8px;flex-wrap:wrap;align-items:flex-end',
    onSubmit: (e) => {
      e.preventDefault();
      const inp = e.currentTarget.querySelector('#bye-paste');
      addFromText(inp.value);
      inp.value = '';
    },
  },
    h('div', { class: 'field', style: 'flex:1 1 200px;margin:0' },
      h('label', { for: 'bye-paste' }, 'Or paste team codes'),
      h('input', {
        id: 'bye-paste',
        type: 'text',
        inputmode: 'text',
        autocomplete: 'off',
        placeholder: 'e.g. KC, SF, PHI, MIA',
        'aria-describedby': 'bye-paste-help',
      })),
    h('button', { type: 'submit', class: 'btn' }, 'Add'));

  return h('div', { class: 'card stack' },
    h('h3', { style: 'margin:0' }, icon('shieldCheck'), ' Bye-conflict checker'),
    h('p', { class: 'muted small', id: 'bye-paste-help', style: 'margin:0' },
      'Tap the teams on your roster. We flag any week where 2 or more of them are off at once.'),
    chips,
    pasteForm,
    state.unresolvedInput.length
      ? h('p', { class: 'notice small', role: 'status', style: 'margin:0' },
          icon('info'), ' Not a known team code: ', h('strong', {}, state.unresolvedInput.join(', ')))
      : null,
    rosterSummary(roster),
    conflictResults(report, roster));
}

function rosterSummary(roster) {
  if (!roster.length) return null;
  return h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    h('span', { class: 'small muted' }, roster.length + (roster.length === 1 ? ' team' : ' teams') + ' selected'),
    h('button', {
      type: 'button',
      class: 'btn-ghost small',
      dataset: { focus: 'clear' },
      onClick: clearRoster,
    }, icon('x'), ' Clear roster'));
}

function conflictResults(report, roster) {
  if (!roster.length) {
    return h('p', { class: 'muted small', role: 'status', style: 'margin:0' },
      'Add your teams above to check for stacked byes.');
  }

  const parts = [];

  // Prominent conflict banner(s) — weeks with 2+ of your teams off.
  if (report.conflicts.length) {
    const worst = report.worstWeek;
    parts.push(h('div', { class: 'stack', role: 'status', style: 'gap:8px' },
      ...report.conflicts.map((c) => {
        const teams = c.players.map((p) => p.team);
        const isWorst = c.week === worst;
        return h('div', { class: 'notice stack', style: 'gap:6px;border-left:4px solid var(--sev-alert)' },
          h('div', { class: 'row', style: 'align-items:center;gap:8px;flex-wrap:wrap' },
            h('span', { class: 'chip chip-alert' }, icon('alert'), 'Week ' + c.week),
            h('strong', {}, c.count + ' of your teams on bye'),
            isWorst ? h('span', { class: 'badge badge-accent' }, 'Earliest stack') : null),
          h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' },
            ...teams.map((t) => h('span', { class: 'chip chip-none' }, t))));
      })));
  } else {
    parts.push(h('p', { class: 'row', role: 'status', style: 'align-items:center;gap:6px;margin:0' },
      icon('shieldCheck'),
      h('span', {}, 'No stacked byes — at most one of your teams is off in any single week.')));
  }

  // Per-team bye list, sorted by week then code.
  const rows = roster
    .map((t) => ({ team: t, week: byeOf(t) }))
    .sort((a, b) => (a.week ?? 99) - (b.week ?? 99) || a.team.localeCompare(b.team));

  parts.push(h('div', { class: 'table-scroll' },
    h('table', {},
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col' }, 'Your team'),
        h('th', { scope: 'col', class: 'num' }, 'Bye week'))),
      h('tbody', {}, ...rows.map((r) => h('tr', {},
        h('td', {}, r.team),
        h('td', { class: 'num' }, r.week != null ? 'Week ' + r.week : '—')))))));

  if (report.unresolved && report.unresolved.length) {
    parts.push(h('p', { class: 'muted small', style: 'margin:0' },
      'Unmatched: ' + report.unresolved.map((p) => p.team).join(', ')));
  }

  return h('div', { class: 'stack', style: 'gap:12px' }, ...parts);
}

/* ---- 3) full bye grid ---- */
function gridCard() {
  const rows = GRID_WEEKS.map((w) => {
    const teams = (state.byeGrid && state.byeGrid[w]) || [];
    return h('tr', {},
      h('th', { scope: 'row', class: 'num' }, 'Week ' + w),
      h('td', { class: 'num' }, teams.length ? String(teams.length) : '0'),
      h('td', {}, teams.length
        ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' },
            ...teams.map((t) => h('span', { class: 'chip chip-none' }, t)))
        : h('span', { class: 'muted small' }, 'No byes')));
  });

  return h('div', { class: 'card stack' },
    h('h3', { style: 'margin:0' }, icon('grid'), ' Full 2026 bye grid'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Byes run Weeks 5–14. Derived from the schedule, not typed by hand.'),
    h('div', { class: 'table-scroll' },
      h('table', {},
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col' }, 'Week'),
          h('th', { scope: 'col', class: 'num' }, 'Teams'),
          h('th', { scope: 'col' }, 'On bye'))),
        h('tbody', {}, ...rows))));
}

/* ---- shell states ---- */
function loadingCard() {
  return h('div', { class: 'card', role: 'status' }, h('p', { class: 'muted', text: 'Loading the 2026 schedule…' }));
}

function errorCard() {
  return h('div', { class: 'card notice' },
    h('p', {}, icon('alert'), ' Could not load the schedule right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: load }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack' },
    state.result ? h('div', { class: 'row', style: 'align-items:center;gap:8px;flex-wrap:wrap' },
      DataAsOfStamp(String(state.result.asOf || '')),
      state.schedule ? h('span', { class: 'small muted' }, state.schedule.season + ' season schedule') : null) : null,
    SourcesBlock([{ label: 'Schedule data via nflverse', url: 'https://github.com/nflverse' }]),
    h('p', { class: 'muted small' },
      'A bye conflict is a counting fact — how many of your teams are off in the same week — not a projection, ranking, or draft recommendation.'));
}

/* ---------- boot ---------- */
function init() { load(); }
if (root) init();
