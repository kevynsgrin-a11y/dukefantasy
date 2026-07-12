/**
 * weather.js — in-season NFL weather board (descriptive, honest, no advice).
 *
 * Wind, precipitation, and temperature AT KICKOFF for a slate of games, flagged
 * by the pure gameweather engine. Everything here is conditions + general
 * effects — never a start/sit call. Domes are marked no-impact.
 *
 * In THIS build the live per-stadium forecast egress is blocked, so we render an
 * ILLUSTRATIVE board: the first week of the schedule, with the bundled Open-Meteo
 * sample applied to every outdoor game, clearly stamped as sample data. The live
 * per-stadium board activates in-season. All data comes from fixtures via getFeed
 * (nflverse schedule + team stadiums + Open-Meteo forecast shape).
 */
import { parseSchedule, kickoffDatetime } from '/engine/schedule.js';
import { flagGame } from '/engine/gameweather.js';
import { h, icon, DataAsOfStamp, SourcesBlock, StalenessStrip } from '/app/ui.js';
import { getFeed } from '/app/feed.js';

const root = document.getElementById('weather-app');

const BANNER =
  'Descriptive conditions only — never start/sit advice. Domes marked no-impact. Sample data shown out of season.';

// impact -> chip presentation (chip-alert / chip-watch / chip-note / chip-none).
const IMPACT = {
  significant: { cls: 'chip-alert', label: 'Significant', ico: 'alert' },
  notable: { cls: 'chip-watch', label: 'Notable', ico: 'wind' },
  minimal: { cls: 'chip-note', label: 'Minor', ico: 'info' },
  none: { cls: 'chip-none', label: 'No impact', ico: 'shieldCheck' },
  unknown: { cls: 'chip-none', label: 'Unknown', ico: 'info' },
};
const IMPACT_RANK = { significant: 3, notable: 2, minimal: 1, none: 0, unknown: 0 };

const SEV_CHIP = { alert: 'chip-alert', watch: 'chip-watch', note: 'chip-note' };
const FLAG_ICON = { wind: 'wind', precip: 'info', cold: 'info', heat: 'sun', altitude: 'scale' };
const FLAG_LABEL = { wind: 'Wind', precip: 'Precip', cold: 'Cold', heat: 'Heat', altitude: 'Altitude' };

const state = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: '',
  weatherResult: null, // forecast feed result (for staleness/asOf)
  schedule: null,
  season: null,
  week: null,
  board: [], // flagGame results, sorted worst-first, each with .game attached
};

/* ---------- data ---------- */
async function load() {
  state.status = 'loading';
  state.error = '';
  render();
  try {
    const [schedRes, stadRes, wxRes] = await Promise.all([
      getFeed({ id: 'nflverse_games_2026', fixture: 'nflverse_schedule_2026.json' }),
      getFeed({ id: 'stadium_coordinates', fixture: 'stadiums.json' }),
      getFeed({ id: 'open_meteo_forecast', fixture: 'openmeteo_sample.json' }),
    ]);

    const schedule = parseSchedule(schedRes.data);
    const stadiums = (stadRes.data && stadRes.data.teams) || {};
    const forecast = wxRes.data; // the SAME sample applied to every outdoor game

    // Slate = the schedule's first week.
    const week = Math.min(...schedule.weeks);
    const games = schedule.reg.filter((g) => g.week === week);

    state.board = games
      .map((game) => {
        const kickoffUtc = kickoffDatetime(game);
        // now = 2 days before kickoff -> always inside the reliable window (illustrative).
        const now = kickoffUtc ? new Date(kickoffUtc.getTime() - 2 * 86400000) : new Date();
        const flagged = flagGame({ game, stadium: stadiums[game.home], forecast, kickoffUtc, now });
        return { ...flagged, game, kickoffUtc };
      })
      .sort((a, b) => (IMPACT_RANK[b.impact] ?? 0) - (IMPACT_RANK[a.impact] ?? 0));

    state.schedule = schedule;
    state.season = schedule.season;
    state.week = week;
    state.weatherResult = wxRes;
    state.status = 'ready';
    render();
  } catch (err) {
    state.status = 'error';
    state.error = (err && err.message) || 'Could not load the weather board.';
    render();
  }
}

/* ---------- render ---------- */
function render() {
  const nodes = [];
  if (state.status === 'error') {
    nodes.push(errorCard());
  } else if (state.status === 'loading' && !state.board.length) {
    nodes.push(bannerCard(), loadingCard());
  } else {
    nodes.push(StalenessStrip(state.weatherResult));
    nodes.push(bannerCard());
    nodes.push(sampleStamp());
    nodes.push(...state.board.map(weatherCard));
  }
  nodes.push(sourcesFooter());
  root.replaceChildren(...nodes.filter(Boolean));
}

/* ---- always-on safety banner (top of tool, above the fold) ---- */
function bannerCard() {
  return h('div', { class: 'notice stack', role: 'note', style: 'gap:6px;border-left:4px solid var(--sev-note, currentColor)' },
    h('p', { class: 'row', style: 'align-items:flex-start;gap:8px;margin:0' },
      icon('shieldCheck'),
      h('strong', { text: BANNER })));
}

/* ---- illustrative-sample + slate stamp ---- */
function sampleStamp() {
  const count = state.board.length;
  return h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    h('span', { class: 'badge badge-brand' }, icon('calendar'),
      ` Week ${state.week} · ${count} game${count === 1 ? '' : 's'}`),
    h('span', { class: 'badge badge-accent' }, icon('info'), ' Illustrative sample'),
    h('span', { class: 'small muted', style: 'flex:1 1 220px' },
      'One Open-Meteo sample forecast is applied to every outdoor game. The live per-stadium board activates in-season.'));
}

/* ---- one game card ---- */
function weatherCard(f) {
  const g = f.game || {};
  const info = f.dome
    ? { cls: 'chip-none', label: 'Dome · no impact', ico: 'shieldCheck' }
    : (IMPACT[f.impact] || IMPACT.none);

  const header = h('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between' },
    h('div', { class: 'stack', style: 'gap:2px' },
      h('h3', { style: 'margin:0' }, `${g.away || '—'} @ ${g.home || '—'}`),
      h('span', { class: 'small muted' }, kickoffLabel(g), g.stadium ? ` · ${g.stadium}` : '')),
    h('span', { class: 'chip ' + info.cls, role: 'status', 'aria-label': 'Weather impact: ' + info.label },
      icon(info.ico), info.label));

  return h('div', { class: 'card stack', style: 'gap:10px' },
    header,
    cardBody(f),
    cardFooter(f));
}

function cardBody(f) {
  // Indoors — nothing to describe.
  if (f.dome) {
    return h('p', { class: 'muted small', style: 'margin:0' },
      icon('shieldCheck'), ' ', f.note || 'Indoors — weather is not a factor.');
  }
  // Beyond window / no forecast at kickoff.
  if (f.beyondWindow || f.impact === 'unknown' || !f.conditions) {
    return h('p', { class: 'muted small', style: 'margin:0' },
      icon('info'), ' ', f.note || 'No forecast available for this kickoff.');
  }

  const parts = [conditionsRow(f.conditions)];

  if (f.flags && f.flags.length) {
    parts.push(h('ul', { class: 'stack', style: 'gap:6px;margin:0;padding:0;list-style:none' },
      ...f.flags.map((fl) => h('li', { class: 'row', style: 'align-items:flex-start;gap:8px;flex-wrap:nowrap' },
        h('span', { class: 'chip ' + (SEV_CHIP[fl.severity] || 'chip-note'), style: 'flex:0 0 auto' },
          icon(FLAG_ICON[fl.type] || 'info'), FLAG_LABEL[fl.type] || fl.type),
        h('span', { class: 'small', text: fl.detail })))));
  } else {
    parts.push(h('p', { class: 'row small muted', style: 'align-items:center;gap:6px;margin:0' },
      icon('shieldCheck'), 'No weather flags at kickoff.'));
  }

  if (f.seasonalNote) {
    parts.push(h('p', { class: 'small muted', style: 'margin:0' }, icon('sun'), ' ', f.seasonalNote));
  }
  return h('div', { class: 'stack', style: 'gap:8px' }, ...parts);
}

function conditionsRow(c) {
  const bits = [];
  if (c.wind != null) {
    bits.push(h('span', { class: 'chip chip-none' }, icon('wind'),
      `${Math.round(c.wind)} mph${c.gust != null ? ` (gusts ${Math.round(c.gust)})` : ''}`));
  }
  if (c.temp != null) bits.push(h('span', { class: 'chip chip-none' }, icon('sun'), `${Math.round(c.temp)}°F`));
  if (c.precipProb != null) bits.push(h('span', { class: 'chip chip-none' }, icon('info'), `${Math.round(c.precipProb)}% precip`));
  if (!bits.length) return null;
  return h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px', 'aria-label': 'Conditions at kickoff' }, ...bits);
}

function cardFooter(f) {
  if (f.dome) return null;
  const conf = f.confidence && f.confidence !== 'none' ? f.confidence : null;
  return h('div', { class: 'row small muted', style: 'align-items:center;gap:10px;flex-wrap:wrap' },
    conf ? h('span', { class: 'row', style: 'align-items:center;gap:4px' }, icon('clock'),
      `Forecast lead time: ${conf}`) : null,
    f.asOf ? h('span', {}, 'Sample as of ', h('span', { text: f.asOf })) : null);
}

function kickoffLabel(g) {
  const day = g.weekday ? g.weekday.slice(0, 3) : '';
  const time = g.gametime ? `${g.gametime} ET` : 'TBD';
  return `${day} ${time}`.trim();
}

/* ---- shell states ---- */
function loadingCard() {
  return h('div', { class: 'card', role: 'status' },
    h('p', { class: 'muted', text: 'Loading this week’s slate…' }));
}

function errorCard() {
  return h('div', { class: 'card notice' },
    h('p', {}, icon('alert'), ' Could not load the weather board right now.'),
    state.error ? h('p', { class: 'muted small', text: state.error }) : null,
    h('button', { class: 'btn', type: 'button', onClick: load }, 'Try again'));
}

function sourcesFooter() {
  return h('div', { class: 'stack' },
    state.weatherResult
      ? h('div', { class: 'row', style: 'align-items:center;gap:8px;flex-wrap:wrap' },
          DataAsOfStamp(String(state.weatherResult.asOf || '')),
          state.season ? h('span', { class: 'small muted' }, `${state.season} season · Week ${state.week}`) : null)
      : null,
    SourcesBlock([
      { label: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/' },
      { label: 'Schedule & team data via nflverse', url: 'https://github.com/nflverse' },
    ]),
    h('p', { class: 'muted small' },
      'Wind, precipitation, and temperature are measured facts from the forecast at kickoff — descriptions of conditions, not projections, rankings, or start/sit advice.'));
}

/* ---------- boot ---------- */
function init() { load(); }
if (root) init();
