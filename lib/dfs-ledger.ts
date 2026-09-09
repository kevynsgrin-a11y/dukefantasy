/**
 * DFS accountability ledger.
 *
 * Projections and results stay EMPTY until real, published picks exist —
 * the accuracy guide works from the same ledger the projections were
 * written to, so the math can never show anything we did not actually
 * publish. Null means not published; nothing is ever backfilled silently.
 */

export type DfsPosition = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST";

/** A projection as published BEFORE the week's games (immutable once live). */
export interface DfsProjection {
  week: number;
  position: DfsPosition;
  player: string;
  teamSlug: string;
  opponentSlug: string;
  projectedPoints: number | null;
  projectedRank: number | null;
  note: string | null;
  publishedAt: string; // ISO date — a projection is only real once published
}

/** The same pick graded AFTER games conclude. */
export interface DfsPickResult {
  week: number;
  position: DfsPosition;
  player: string;
  teamSlug: string;
  projectedPoints: number | null;
  projectedRank: number | null;
  actualPoints: number | null;
  actualRank: number | null;
}

/**
 * We grade only what we recommend: a pick is GRADED when we ranked it
 * inside the top 10 at its position. A graded pick is a HIT when it
 * finished inside the actual top 10 at the position.
 */
export const GRADE_DEPTH = 10;

export const projections: DfsProjection[] = [];
export const pickResults: DfsPickResult[] = [];
export const dfsLedgerAsOf: string | null = null;

export interface AccuracyStat {
  week: number | null; // null = season aggregate
  gradedPicks: number;
  hits: number;
  misses: number;
  hitRate: number | null;
  /** Mean absolute error in fantasy points, where both sides published. */
  mae: number | null;
  bias: "even" | "high" | "low" | null; // aggregate direction of error
}

export function isGraded(pick: DfsPickResult): boolean {
  return pick.projectedRank !== null && pick.projectedRank <= GRADE_DEPTH;
}

export function isHit(pick: DfsPickResult): boolean | null {
  if (!isGraded(pick) || pick.actualRank === null) return null;
  return pick.actualRank <= GRADE_DEPTH;
}

export function accuracyFor(entries: DfsPickResult[], week: number | null = null): AccuracyStat {
  const scoped = week === null ? entries : entries.filter((entry) => entry.week === week);
  const graded = scoped.filter(isGraded).filter((pick) => pick.actualRank !== null);
  const hits = graded.filter((pick) => isHit(pick) === true).length;
  const misses = graded.length - hits;
  const pointPairs = scoped.filter(
    (pick) => pick.projectedPoints !== null && pick.actualPoints !== null,
  );
  const mae =
    pointPairs.length > 0
      ? pointPairs.reduce(
          (sum, pick) => sum + Math.abs((pick.projectedPoints ?? 0) - (pick.actualPoints ?? 0)),
          0,
        ) / pointPairs.length
      : null;
  const signedTotal = pointPairs.reduce(
    (sum, pick) => sum + (pick.projectedPoints ?? 0) - (pick.actualPoints ?? 0),
    0,
  );
  const bias =
    pointPairs.length === 0
      ? null
      : Math.abs(signedTotal) < 0.5 * pointPairs.length
        ? "even"
        : signedTotal > 0
          ? "high"
          : "low";
  return {
    week,
    gradedPicks: graded.length,
    hits,
    misses,
    hitRate: graded.length > 0 ? hits / graded.length : null,
    mae,
    bias,
  };
}

export function accuracyByWeek(entries: DfsPickResult[]): AccuracyStat[] {
  const weeks = [...new Set(entries.map((entry) => entry.week))].sort((a, b) => a - b);
  return weeks.map((week) => accuracyFor(entries, week));
}

export const ACCURACY_METHOD = {
  grading: `Only picks ranked inside the top ${GRADE_DEPTH} at their position are graded. A hit means the player finished inside the actual top ${GRADE_DEPTH} at that position.`,
  hitRate: "Hits divided by graded picks, reported per week and for the season. No cherry-picking: every published top-10 pick grades, including injuries and surprises.",
  mae: "Mean absolute error in fantasy points between projection and actual, across every pick where both sides published. Reported alongside hit rate because ranks and points measure different kinds of right.",
  bias: "The aggregate signed error — whether we lean high or low on projections. An even lean is the goal; a persistent lean is a correction we owe you.",
  ledger: "Projections are written before the week and never edited after kickoff. Graded results come from the same ledger, so the accuracy guide can only ever show what we actually published.",
} as const;
