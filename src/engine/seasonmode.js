/**
 * seasonmode.js — the archive-pivot lesson institutionalized in code.
 *
 * The site flips between three modes automatically:
 *   - 'draft'     now -> kickoff: countdown + flagship Randomizer + tool grid.
 *   - 'in-season' after Week 1: weather board + waiver radar as the retention
 *                 layer; tools demoted to a grid.
 *   - 'offseason' January-ish: honest archive + email capture.
 *
 * Primary signal is Sleeper /state/nfl (season_type + week); date is the
 * tie-breaker for the off-season vs. draft-ramp distinction. Pure module,
 * fixture-tested (GV11).
 */

export const MODES = Object.freeze(['draft', 'in-season', 'offseason']);

/**
 * Resolve the current site mode.
 * @param {object} state  Sleeper /state/nfl object ({ season_type, week, season, season_start_date })
 * @param {object} [opts] { now }
 * @returns {{ mode:string, reason:string, seasonType:string, week:number }}
 */
export function getSeasonMode(state = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  const seasonType = String(state.season_type || '').toLowerCase();
  const week = Number(state.week) || 0;
  const month = now.getUTCMonth() + 1; // 1-12

  // Regular season or playoffs -> in-season (games are being played).
  if (seasonType === 'regular' && week >= 1) {
    return mk('in-season', `Regular season, week ${week}.`, seasonType, week);
  }
  if (seasonType === 'post') {
    return mk('in-season', 'Playoffs in progress.', seasonType, week);
  }

  // Preseason -> draft season (peak drafting happens in August preseason).
  if (seasonType === 'pre') {
    return mk('draft', 'Preseason — peak draft season.', seasonType, week);
  }

  // Off-season: date decides. Summer/early-fall ramp -> draft; deep winter -> offseason.
  if (seasonType === 'off' || !seasonType) {
    if (month >= 6 && month <= 9) return mk('draft', 'Pre-kickoff ramp — draft season.', seasonType || 'off', week);
    return mk('offseason', 'Deep off-season — archive mode.', seasonType || 'off', week);
  }

  // Fallback.
  return mk('draft', 'Default draft mode.', seasonType, week);
}

/**
 * Pure date-based fallback when Sleeper state is unavailable (triple-fallback
 * covenant): before kickoff in summer -> draft; between kickoff and ~early Jan
 * -> in-season; Feb-May -> offseason.
 */
export function getSeasonModeFromDate(now, kickoffUtc) {
  const d = now instanceof Date ? now : new Date(now);
  const month = d.getUTCMonth() + 1;
  if (kickoffUtc) {
    const k = kickoffUtc instanceof Date ? kickoffUtc : new Date(kickoffUtc);
    if (d < k) return month >= 6 ? mk('draft', 'Before kickoff.', 'date', 0) : mk('offseason', 'Deep off-season.', 'date', 0);
    // After kickoff: in-season through early January, then offseason.
    if (month === 1 && d.getUTCDate() > 12) return mk('offseason', 'Post-playoffs.', 'date', 0);
    if (month >= 2 && month <= 5) return mk('offseason', 'Off-season.', 'date', 0);
    return mk('in-season', 'Season underway.', 'date', 0);
  }
  if (month >= 9 || month === 1) return mk('in-season', 'Season window.', 'date', 0);
  if (month >= 6 && month <= 8) return mk('draft', 'Draft season.', 'date', 0);
  return mk('offseason', 'Off-season.', 'date', 0);
}

function mk(mode, reason, seasonType, week) {
  return { mode, reason, seasonType, week };
}
