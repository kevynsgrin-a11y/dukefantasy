/**
 * Canonical NFL team reference table (facts, used nominatively).
 *
 * Team abbreviations match Sleeper's conventions (JAX, LV, WAS, LAR, LAC).
 * `aliases` power the identity matcher's D/ST resolution — every plausible way
 * an ADP source might spell a team defense maps back to one abbreviation.
 *
 * No logos, no marks — text only. This is openly-known reference data, kept in
 * code so the identity layer has zero external dependency for defenses.
 */

export const NFL_TEAMS = [
  { abbrev: 'ARI', city: 'Arizona', nickname: 'Cardinals', aliases: ['arizona cardinals', 'ari', 'cardinals', 'arizona'] },
  { abbrev: 'ATL', city: 'Atlanta', nickname: 'Falcons', aliases: ['atlanta falcons', 'atl', 'falcons', 'atlanta'] },
  { abbrev: 'BAL', city: 'Baltimore', nickname: 'Ravens', aliases: ['baltimore ravens', 'bal', 'ravens', 'baltimore'] },
  { abbrev: 'BUF', city: 'Buffalo', nickname: 'Bills', aliases: ['buffalo bills', 'buf', 'bills', 'buffalo'] },
  { abbrev: 'CAR', city: 'Carolina', nickname: 'Panthers', aliases: ['carolina panthers', 'car', 'panthers', 'carolina'] },
  { abbrev: 'CHI', city: 'Chicago', nickname: 'Bears', aliases: ['chicago bears', 'chi', 'bears', 'chicago'] },
  { abbrev: 'CIN', city: 'Cincinnati', nickname: 'Bengals', aliases: ['cincinnati bengals', 'cin', 'bengals', 'cincinnati'] },
  { abbrev: 'CLE', city: 'Cleveland', nickname: 'Browns', aliases: ['cleveland browns', 'cle', 'browns', 'cleveland'] },
  { abbrev: 'DAL', city: 'Dallas', nickname: 'Cowboys', aliases: ['dallas cowboys', 'dal', 'cowboys', 'dallas'] },
  { abbrev: 'DEN', city: 'Denver', nickname: 'Broncos', aliases: ['denver broncos', 'den', 'broncos', 'denver'] },
  { abbrev: 'DET', city: 'Detroit', nickname: 'Lions', aliases: ['detroit lions', 'det', 'lions', 'detroit'] },
  { abbrev: 'GB', city: 'Green Bay', nickname: 'Packers', aliases: ['green bay packers', 'gb', 'gnb', 'packers', 'green bay'] },
  { abbrev: 'HOU', city: 'Houston', nickname: 'Texans', aliases: ['houston texans', 'hou', 'texans', 'houston'] },
  { abbrev: 'IND', city: 'Indianapolis', nickname: 'Colts', aliases: ['indianapolis colts', 'ind', 'colts', 'indianapolis'] },
  { abbrev: 'JAX', city: 'Jacksonville', nickname: 'Jaguars', aliases: ['jacksonville jaguars', 'jax', 'jac', 'jaguars', 'jacksonville'] },
  { abbrev: 'KC', city: 'Kansas City', nickname: 'Chiefs', aliases: ['kansas city chiefs', 'kc', 'kan', 'chiefs', 'kansas city'] },
  { abbrev: 'LAC', city: 'Los Angeles', nickname: 'Chargers', aliases: ['los angeles chargers', 'lac', 'chargers', 'la chargers', 'san diego chargers'] },
  { abbrev: 'LAR', city: 'Los Angeles', nickname: 'Rams', aliases: ['los angeles rams', 'lar', 'la', 'rams', 'la rams', 'st louis rams', 'st. louis rams'] },
  { abbrev: 'LV', city: 'Las Vegas', nickname: 'Raiders', aliases: ['las vegas raiders', 'lv', 'lvr', 'oak', 'raiders', 'las vegas', 'oakland raiders'] },
  { abbrev: 'MIA', city: 'Miami', nickname: 'Dolphins', aliases: ['miami dolphins', 'mia', 'dolphins', 'miami'] },
  { abbrev: 'MIN', city: 'Minnesota', nickname: 'Vikings', aliases: ['minnesota vikings', 'min', 'vikings', 'minnesota'] },
  { abbrev: 'NE', city: 'New England', nickname: 'Patriots', aliases: ['new england patriots', 'ne', 'nwe', 'patriots', 'new england'] },
  { abbrev: 'NO', city: 'New Orleans', nickname: 'Saints', aliases: ['new orleans saints', 'no', 'nor', 'saints', 'new orleans'] },
  { abbrev: 'NYG', city: 'New York', nickname: 'Giants', aliases: ['new york giants', 'nyg', 'giants', 'ny giants'] },
  { abbrev: 'NYJ', city: 'New York', nickname: 'Jets', aliases: ['new york jets', 'nyj', 'jets', 'ny jets'] },
  { abbrev: 'PHI', city: 'Philadelphia', nickname: 'Eagles', aliases: ['philadelphia eagles', 'phi', 'eagles', 'philadelphia'] },
  { abbrev: 'PIT', city: 'Pittsburgh', nickname: 'Steelers', aliases: ['pittsburgh steelers', 'pit', 'steelers', 'pittsburgh'] },
  { abbrev: 'SF', city: 'San Francisco', nickname: '49ers', aliases: ['san francisco 49ers', 'sf', 'sfo', '49ers', 'niners', 'san francisco'] },
  { abbrev: 'SEA', city: 'Seattle', nickname: 'Seahawks', aliases: ['seattle seahawks', 'sea', 'seahawks', 'seattle'] },
  { abbrev: 'TB', city: 'Tampa Bay', nickname: 'Buccaneers', aliases: ['tampa bay buccaneers', 'tb', 'tam', 'buccaneers', 'bucs', 'tampa bay', 'tampa'] },
  { abbrev: 'TEN', city: 'Tennessee', nickname: 'Titans', aliases: ['tennessee titans', 'ten', 'titans', 'tennessee'] },
  { abbrev: 'WAS', city: 'Washington', nickname: 'Commanders', aliases: ['washington commanders', 'was', 'wsh', 'commanders', 'washington', 'washington football team'] },
];

export const TEAM_BY_ABBREV = Object.freeze(
  Object.fromEntries(NFL_TEAMS.map((t) => [t.abbrev, t])),
);

/** Map every alias (and abbrev/city/nickname) to its team abbreviation. */
export const TEAM_ALIAS_TO_ABBREV = (() => {
  const m = new Map();
  for (const t of NFL_TEAMS) {
    const keys = new Set([t.abbrev.toLowerCase(), t.city.toLowerCase(), t.nickname.toLowerCase(), ...t.aliases]);
    for (const k of keys) m.set(k, t.abbrev);
  }
  return m;
})();
