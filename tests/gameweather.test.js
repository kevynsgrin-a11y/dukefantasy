import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagGame, forecastAtKickoff, leadTimeConfidence, WIND_WATCH } from '../src/engine/gameweather.js';

// Build a forecast with a single controllable hour at kickoff (UTC).
function forecastWith({ wind = 5, gust = 8, precipProb = 0, precip = 0, temp = 65, code = 1 }) {
  return {
    hourly: {
      time: ['2026-11-15T17:00', '2026-11-15T18:00', '2026-11-15T19:00'],
      temperature_2m: [temp, temp, temp],
      precipitation: [precip, precip, precip],
      precipitation_probability: [precipProb, precipProb, precipProb],
      windspeed_10m: [wind, wind, wind],
      windgusts_10m: [gust, gust, gust],
      weathercode: [code, code, code],
    },
  };
}
const KICK = '2026-11-15T18:00:00Z';
const NOW = '2026-11-13T18:00:00Z'; // 2 days out (in window)
const outdoorGame = { week: 11, home: 'BUF', away: 'MIA', roof: 'outdoors' };

test('GV10 — 18 mph wind flags; 14 mph does not', () => {
  const windy = flagGame({ game: outdoorGame, forecast: forecastWith({ wind: 18 }), kickoffUtc: KICK, now: NOW });
  assert.ok(windy.flags.some((f) => f.type === 'wind'));
  assert.notEqual(windy.impact, 'none');

  const calm = flagGame({ game: outdoorGame, forecast: forecastWith({ wind: 14 }), kickoffUtc: KICK, now: NOW });
  assert.ok(!calm.flags.some((f) => f.type === 'wind'));
  assert.equal(calm.impact, 'none');
});

test('GV10 — 20+ mph escalates to alert severity', () => {
  const g = flagGame({ game: outdoorGame, forecast: forecastWith({ wind: 24, gust: 33 }), kickoffUtc: KICK, now: NOW });
  const wind = g.flags.find((f) => f.type === 'wind');
  assert.equal(wind.severity, 'alert');
  assert.equal(g.impact, 'significant');
});

test('GV10 — dome overrides all weather', () => {
  const domeGame = { week: 11, home: 'MIN', away: 'GB', roof: 'dome' };
  const g = flagGame({ game: domeGame, forecast: forecastWith({ wind: 40, precipProb: 100 }), kickoffUtc: KICK, now: NOW });
  assert.equal(g.dome, true);
  assert.equal(g.impact, 'none');
  assert.equal(g.flags.length, 0);
});

test('GV10 — game beyond the window renders "not yet reliable"', () => {
  const g = flagGame({ game: outdoorGame, forecast: forecastWith({ wind: 30 }), kickoffUtc: KICK, now: '2026-11-06T18:00:00Z' /* 9 days out */ });
  assert.equal(g.beyondWindow, true);
  assert.equal(g.impact, 'unknown');
  assert.match(g.note, /not yet reliable/i);
});

test('precip probability flags with type', () => {
  const g = flagGame({ game: outdoorGame, forecast: forecastWith({ precipProb: 65, code: 63 }), kickoffUtc: KICK, now: NOW });
  const p = g.flags.find((f) => f.type === 'precip');
  assert.ok(p);
  assert.match(p.detail, /rain/);
});

test('altitude note for Denver, and December seasonal Nino hook', () => {
  const decGame = { week: 15, home: 'DEN', away: 'LV', roof: 'outdoors' };
  const g = flagGame({ game: decGame, stadium: { roof: 'outdoor', altitude_ft: 5280 }, forecast: forecastWith({ wind: 8 }), kickoffUtc: KICK, now: NOW });
  assert.ok(g.flags.some((f) => f.type === 'altitude'));
  assert.match(g.seasonalNote, /Nino34/);
});

test('no start/sit advice leaks into flag details', () => {
  const g = flagGame({ game: outdoorGame, forecast: forecastWith({ wind: 22 }), kickoffUtc: KICK, now: NOW });
  for (const f of g.flags) {
    assert.doesNotMatch(f.detail, /\b(start|sit|bench|must-start|avoid)\b/i);
  }
});

test('forecastAtKickoff picks the nearest hour', () => {
  const fc = forecastWith({ wind: 10 });
  const at = forecastAtKickoff(fc, '2026-11-15T18:20:00Z');
  assert.equal(at.time, '2026-11-15T18:00'); // nearest to 18:20
});

test('lead-time confidence buckets', () => {
  assert.equal(leadTimeConfidence(24), 'high');
  assert.equal(leadTimeConfidence(72), 'medium');
  assert.equal(leadTimeConfidence(150), 'low');
  assert.equal(leadTimeConfidence(400), 'none');
  assert.equal(WIND_WATCH, 15);
});
