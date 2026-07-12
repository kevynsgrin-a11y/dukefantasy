/**
 * gameweather.js — in-season weather flags. Lean, descriptive, honest.
 *
 * Per-game flags from Open-Meteo forecast at kickoff: wind >= 15 mph (escalating
 * at 20+), precipitation probability/type, temperature extremes, dome = no
 * impact, altitude note (Denver). Honesty rules baked in:
 *   - Render only within the reliable forecast window (~7 days); label lead-time
 *     confidence; stamp fetch time.
 *   - NO player-level start/sit advice — conditions and GENERAL positional
 *     effects only. That is our lane; graded punditry is not.
 *   - December games carry an El Nino winter-context hook linking to Nino34.
 *
 * Pure module, fixture-tested (GV10).
 */

import { formatAsOfTime } from './util/staleness.js';

export const WIND_WATCH = 15;   // mph — wind starts to matter
export const WIND_ALERT = 20;   // mph — passing/kicking game meaningfully affected
export const PRECIP_PROB_FLAG = 50; // %
export const COLD_F = 20;
export const HEAT_F = 95;
export const DEFAULT_WINDOW_DAYS = 7;

const DOME_ROOFS = new Set(['dome', 'closed']); // per-game roof state = no weather impact

/** Lead-time confidence label for a forecast this many hours out. */
export function leadTimeConfidence(hoursOut) {
  if (hoursOut <= 48) return 'high';
  if (hoursOut <= 96) return 'medium';
  if (hoursOut <= DEFAULT_WINDOW_DAYS * 24) return 'low';
  return 'none';
}

/** Find the forecast hour nearest a kickoff instant. Treats naive ISO as UTC. */
export function forecastAtKickoff(forecast, kickoffUtc) {
  const h = forecast && forecast.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length === 0) return null;
  const target = (kickoffUtc instanceof Date ? kickoffUtc : new Date(kickoffUtc)).getTime();
  let best = -1, bestDiff = Infinity;
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(h.time[i]) ? h.time[i] : h.time[i] + 'Z').getTime();
    const diff = Math.abs(t - target);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  if (best < 0) return null;
  return {
    index: best,
    time: h.time[best],
    temperature: pick(h.temperature_2m, best),
    precipitation: pick(h.precipitation, best),
    precipProbability: pick(h.precipitation_probability, best),
    windspeed: pick(h.windspeed_10m, best),
    windgusts: pick(h.windgusts_10m, best),
    weathercode: pick(h.weathercode, best),
  };
}
const pick = (arr, i) => (Array.isArray(arr) ? arr[i] : null);

/**
 * Flag a single game's weather.
 * @param {object} args
 * @param {object} args.game       schedule game (has roof, home, week)
 * @param {object} [args.stadium]  { roof, altitude_ft, stadium }
 * @param {object} [args.forecast] Open-Meteo response (UTC hourly recommended)
 * @param {Date|string} args.kickoffUtc
 * @param {Date|string} [args.now]
 * @param {number} [args.windowDays=7]
 */
export function flagGame({ game, stadium, forecast, kickoffUtc, now = new Date(), windowDays = DEFAULT_WINDOW_DAYS }) {
  const roof = (game && game.roof) || (stadium && stadium.roof) || 'outdoors';
  const base = { week: game?.week, home: game?.home, away: game?.away, roof, dome: false, flags: [], impact: 'none' };

  // 1) Indoors -> weather is not a factor.
  if (DOME_ROOFS.has(String(roof).toLowerCase()) || String(stadium?.roof).toLowerCase() === 'dome') {
    return { ...base, dome: true, impact: 'none', note: 'Indoors — weather is not a factor.', confidence: 'high' };
  }

  const kMs = (kickoffUtc instanceof Date ? kickoffUtc : new Date(kickoffUtc)).getTime();
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const hoursOut = (kMs - nowMs) / 3600000;

  // 2) Beyond the reliable window.
  if (hoursOut > windowDays * 24) {
    return { ...base, beyondWindow: true, impact: 'unknown', confidence: 'none',
      note: `Forecast not yet reliable — kickoff is ${Math.round(hoursOut / 24)} days out. We render weather inside ${windowDays} days.` };
  }

  // 3) In-window: read the forecast at kickoff.
  const fc = forecast ? forecastAtKickoff(forecast, kickoffUtc) : null;
  if (!fc) {
    return { ...base, impact: 'unknown', confidence: leadTimeConfidence(hoursOut), note: 'No forecast data available at kickoff hour.' };
  }

  const flags = [];
  const wind = num(fc.windspeed), gust = num(fc.windgusts), precipProb = num(fc.precipProbability), precip = num(fc.precipitation), temp = num(fc.temperature);

  if (wind != null && wind >= WIND_WATCH) {
    const severity = wind >= WIND_ALERT ? 'alert' : 'watch';
    flags.push({ type: 'wind', severity, value: wind, gust,
      detail: severity === 'alert'
        ? `Wind ${Math.round(wind)} mph${gust ? ` (gusts ${Math.round(gust)})` : ''} — the deep passing and kicking game generally take a hit in wind this strong.`
        : `Breezy: wind ${Math.round(wind)} mph${gust ? ` (gusts ${Math.round(gust)})` : ''}.` });
  }
  if (precipProb != null && precipProb >= PRECIP_PROB_FLAG) {
    const type = precipType(fc.weathercode);
    flags.push({ type: 'precip', severity: precipProb >= 70 ? 'alert' : 'watch', value: precipProb,
      detail: `${precipProb}% chance of ${type}${precip ? ` (~${precip}" at kickoff)` : ''}.` });
  }
  if (temp != null && temp <= COLD_F) flags.push({ type: 'cold', severity: temp <= 5 ? 'alert' : 'watch', value: temp, detail: `Cold: ${Math.round(temp)}°F at kickoff.` });
  if (temp != null && temp >= HEAT_F) flags.push({ type: 'heat', severity: 'watch', value: temp, detail: `Heat: ${Math.round(temp)}°F at kickoff.` });

  const altitude = stadium?.altitude_ft || 0;
  if (altitude >= 4000) flags.push({ type: 'altitude', severity: 'note', value: altitude, detail: `High altitude (${altitude} ft) — thinner air; a general context note, not a weather hazard.` });

  const impact = worstImpact(flags);
  const out = {
    ...base,
    impact,
    flags,
    conditions: { wind, gust, precipProb, precip, temp, weathercode: fc.weathercode },
    confidence: leadTimeConfidence(hoursOut),
    asOf: formatAsOfTime(now),
    forecastHour: fc.time,
  };
  // December El Nino winter-context hook (links to the Nino34 southern-storm-track angle).
  if (game && game.week >= 14) {
    out.seasonalNote = 'Late-season game — in an El Niño winter the southern storm track runs hotter. Winter-weather context: Nino34.';
  }
  return out;
}

function precipType(code) {
  const c = Number(code);
  if (c >= 71 && c <= 77) return 'snow';
  if (c >= 95) return 'thunderstorms';
  if (c >= 51) return 'rain';
  return 'precipitation';
}
function worstImpact(flags) {
  if (flags.some((f) => f.severity === 'alert')) return 'significant';
  if (flags.some((f) => f.severity === 'watch')) return 'notable';
  if (flags.some((f) => f.severity === 'note')) return 'minimal';
  return 'none';
}
const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Build the weather board for a set of games.
 * @param {object} args
 * @param {Array} args.games            schedule games (already filtered to a week)
 * @param {object} args.stadiums        { TEAM: stadiumInfo }
 * @param {object} args.forecasts       { TEAM: openMeteoResponse } (home team keyed)
 * @param {function} args.kickoffOf     game -> kickoff Date/ISO
 * @param {Date} [args.now]
 * @param {number} [args.windowDays]
 */
export function buildWeatherBoard({ games, stadiums = {}, forecasts = {}, kickoffOf, now = new Date(), windowDays = DEFAULT_WINDOW_DAYS }) {
  return games.map((game) => {
    const stadium = stadiums[game.home] || null;
    const forecast = forecasts[game.home] || null;
    const kickoffUtc = kickoffOf ? kickoffOf(game) : null;
    return flagGame({ game, stadium, forecast, kickoffUtc, now, windowDays });
  }).sort((a, b) => rank(b.impact) - rank(a.impact));
}
function rank(impact) {
  return { significant: 3, notable: 2, minimal: 1, none: 0, unknown: 0 }[impact] ?? 0;
}
