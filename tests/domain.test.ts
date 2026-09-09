import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateBuyout } from "../lib/contracts.ts";
import nfl from "../lib/nfl-generated.ts";
import {
  coaches,
  fantasyNotes,
  games,
  portalEvents,
  preseasonRatings,
  providerHealth,
  scenarioGames,
  stadiums,
  teams,
  tvRows,
} from "../lib/cfb-dataset.ts";
import { normalizeForcedOutcomes, runPlayoffSimulation } from "../lib/simulation.ts";

test("schedule is complete: every game references real teams and carries kickoff info", () => {
  assert.equal(teams.length, 32);
  assert.ok(games.length >= 250, `expected a full season schedule, got ${games.length}`);
  const slugs = new Set(teams.map((team) => team.slug));
  for (const game of games) {
    assert.ok(slugs.has(game.awayTeamId), `${game.id}: unknown away team`);
    assert.ok(slugs.has(game.homeTeamId), `${game.id}: unknown home team`);
    assert.match(game.kickoffLabel, /ET/, game.id);
    assert.ok(game.week >= 1 && game.week <= 22, `${game.id}: bad week ${game.week}`);
  }
  const withBroadcast = games.filter((game) => game.broadcast);
  assert.ok(withBroadcast.length >= 200, `expected TV designations, got ${withBroadcast.length}`);
  // 2026 opener: Thursday night international game on Netflix.
  const opener = games.find((game) => game.id === "401872657");
  assert.equal(opener?.broadcast, "Netflix");
  assert.match(opener?.venue ?? "", /Melbourne/i);
});

test("standings cover all 32 teams with honest records", () => {
  const entries = Object.values(nfl.standings);
  assert.equal(entries.length, 32);
  const slugs = new Set(teams.map((team) => team.slug));
  for (const row of entries) {
    assert.ok(slugs.has(row.slug), `standings: unknown team ${row.slug}`);
    assert.match(row.record, /^\d+-\d+(-\d+)?$/, row.slug);
  }
});

test("CFB-only surfaces stay empty and honest in the NFL build", () => {
  assert.equal(coaches.length, 0);
  assert.equal(portalEvents.length, 0);
  assert.equal(fantasyNotes.length, 0);
  assert.equal(stadiums.length, 0);
  assert.equal(Object.keys(preseasonRatings).length, 0);
  assert.equal(scenarioGames.length, 0);
});

test("every team carries a logo file and a brand color", () => {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  for (const team of teams) {
    assert.match(team.logo ?? "", /^\/logos\/[a-z0-9-]+\.png$/, team.slug);
    assert.ok(existsSync(`${projectRoot}/public${team.logo}`), `${team.slug}: missing file`);
    assert.match(team.color, /^#[0-9a-fA-F]{6}$/, team.slug);
  }
  for (const slug of [
    "kansas-city-chiefs",
    "dallas-cowboys",
    "green-bay-packers",
    "new-england-patriots",
    "san-francisco-49ers",
  ]) {
    assert.ok(teams.some((team) => team.slug === slug), `${slug} missing from the dataset`);
  }
});

test("TV rows mirror the schedule with ET times", () => {
  assert.equal(tvRows.length, games.length);
  for (const row of tvRows) {
    if (row.time_et) assert.match(row.time_et, /\d{1,2}:\d{2} [AP]M ET/, `${row.away} at ${row.home}`);
  }
});

test("affiliate seams stay fail-closed until configured", async () => {
  const { ticketLinksForTeam, ticketAffiliatesConfigured, ticketPartners } = await import("../lib/affiliates.ts");
  // LINK-FIRST: every partner always yields a working https link.
  const links = ticketLinksForTeam("Kansas City Chiefs");
  assert.equal(links.length, ticketPartners.length);
  for (const link of links) {
    assert.match(link.url, /^https:\/\//, link.partner);
    if (ticketAffiliatesConfigured && link.tracked) {
      assert.ok(link.url.includes("url="), "wrapper must encode the destination");
    } else {
      assert.equal(link.tracked, false, `${link.partner}: untracked must be direct`);
    }
  }
});

test("playoff simulation is deterministic under the same seed", () => {
  const first = runPlayoffSimulation("same-seed", {}, 2_000);
  const second = runPlayoffSimulation("same-seed", {}, 2_000);
  assert.deepEqual(first, second);
});

test("different seeds vary and probabilities stay bounded", () => {
  const first = runPlayoffSimulation("seed-a", {}, 2_000);
  const second = runPlayoffSimulation("seed-b", {}, 2_000);
  assert.notDeepEqual(first.results, second.results);
  for (const result of first.results) {
    assert.ok(result.playoff >= 0 && result.playoff <= 1);
    assert.ok(result.bye >= 0 && result.bye <= 1);
    assert.ok(result.title >= 0 && result.title <= 1);
  }
  const titleTotal = first.results.reduce((sum, result) => sum + result.title, 0);
  assert.ok(Math.abs(titleTotal - 1) < 0.001);
});

test("forced outcomes reject games that are not on the board", () => {
  // The NFL build ships no scenario board yet, so every forced pair must be
  // dropped rather than silently influencing the simulation.
  assert.deepEqual(normalizeForcedOutcomes({ "no-such-game": "kansas-city-chiefs" }), {});
  const result = runPlayoffSimulation("fractional", {}, 1_000.5);
  assert.equal(result.iterations, 1_000);
  assert.ok(Math.abs(result.results.reduce((sum, item) => sum + item.title, 0) - 1) < 0.001);
});

test("buyout applies mitigation without going negative", () => {
  const result = calculateBuyout({
    guaranteedRemaining: 13_000_000,
    mitigationApplies: true,
    estimatedOffset: 2_000_000,
  });
  assert.equal(result.estimatedNet, 11_000_000);
  assert.equal(
    calculateBuyout({
      guaranteedRemaining: 1_000_000,
      mitigationApplies: true,
      estimatedOffset: 2_000_000,
    }).estimatedNet,
    0,
  );
});

test("X & Ys concept library is complete and scheme families map to real teams", async () => {
  const { CONCEPT_LIBRARY, SCHEME_FAMILIES, TECHNIQUE_PRIMERS, WEEKLY_SPOTLIGHTS, publishedSpotlights } =
    await import("../lib/x-and-ys.ts");
  assert.ok(CONCEPT_LIBRARY.length >= 20, `expected a full concept library, got ${CONCEPT_LIBRARY.length}`);
  assert.ok(CONCEPT_LIBRARY.some((c) => c.side === "pass") && CONCEPT_LIBRARY.some((c) => c.side === "run"));
  for (const concept of CONCEPT_LIBRARY) {
    assert.match(concept.id, /^[a-z-]+$/);
    assert.ok(concept.macro.length > 80, `${concept.id}: macro too thin`);
    assert.ok(concept.micro.length > 80, `${concept.id}: micro too thin`);
    assert.ok(concept.beats.length > 5, `${concept.id}: beats missing`);
    assert.ok(concept.tags.length >= 1, `${concept.id}: no tags`);
  }
  const slugs = new Set(teams.map((team) => team.slug));
  for (const family of SCHEME_FAMILIES) {
    assert.ok(family.teamSlugs.length >= 1, `${family.id}: no teams mapped`);
    for (const slug of family.teamSlugs) {
      assert.ok(slugs.has(slug), `${family.id}: unknown team slug ${slug}`);
    }
  }
  assert.ok(TECHNIQUE_PRIMERS.length >= 5);
  // Spotlight slots must never fabricate: a slot without a video has no
  // playmaker, team, or concept attached.
  for (const spotlight of WEEKLY_SPOTLIGHTS) {
    if (spotlight.videoUrl === null) {
      assert.equal(spotlight.playmaker, null);
      assert.equal(spotlight.teamSlug, null);
      assert.equal(spotlight.publishedAt, null);
    } else {
      assert.match(spotlight.videoUrl, /^https:\/\//);
      assert.ok(spotlight.playmaker, "published spotlight needs a playmaker");
    }
  }
  assert.equal(publishedSpotlights().length, 0); // nothing publishes before Week 1 completes
});

test("DFS ledger grades only published top-10 picks and reports honest accuracy", async () => {
  const { accuracyFor, accuracyByWeek, isGraded, isHit, GRADE_DEPTH, projections, pickResults } =
    await import("../lib/dfs-ledger.ts");
  assert.equal(projections.length, 0); // fail-closed until picks publish
  assert.equal(pickResults.length, 0);
  assert.ok(GRADE_DEPTH === 10);

  // Synthetic ledger to verify the math deterministically.
  const fake: import("../lib/dfs-ledger.ts").DfsPickResult[] = [
    { week: 1, position: "WR", player: "A", teamSlug: "t", projectedPoints: 20, projectedRank: 3, actualPoints: 18, actualRank: 4 },
    { week: 1, position: "WR" as const, player: "B", teamSlug: "t", projectedPoints: 14, projectedRank: 8, actualPoints: 6, actualRank: 28 },
    { week: 1, position: "QB" as const, player: "C", teamSlug: "t", projectedPoints: 22, projectedRank: 12, actualPoints: 9, actualRank: 20 },
    { week: 2, position: "RB" as const, player: "D", teamSlug: "t", projectedPoints: 17, projectedRank: 2, actualPoints: 24, actualRank: 1 },
  ];
  assert.equal(isGraded(fake[0]), true);
  assert.equal(isGraded(fake[2]), false); // rank 12 is outside grading depth
  assert.equal(isHit(fake[0]), true);
  assert.equal(isHit(fake[1]), false);
  assert.equal(isHit(fake[2]), null);

  const week1 = accuracyFor(fake, 1);
  assert.equal(week1.gradedPicks, 2);
  assert.equal(week1.hits, 1);
  assert.equal(week1.hitRate, 0.5);
  // MAE uses every pick with both points published, including the ungraded one.
  assert.ok(Math.abs((week1.mae ?? 0) - (2 + 8 + 13) / 3) < 1e-9);
  const season = accuracyFor(fake);
  assert.equal(season.gradedPicks, 3);
  assert.equal(season.hits, 2);
  assert.equal(accuracyByWeek(fake).length, 2);

  const empty = accuracyFor([]);
  assert.equal(empty.hitRate, null);
  assert.equal(empty.mae, null);
  assert.equal(empty.bias, null);
});

test("injury desk: ESPN base loads, long-term rule holds, cadence always has a next slot", async () => {
  const injury = await import("../lib/injury-report.ts");
  assert.ok(injury.espnInjuries.length >= 200, `expected a loaded ESPN injury base, got ${injury.espnInjuries.length}`);
  const slugs = new Set(teams.map((team) => team.slug));
  for (const entry of injury.espnInjuries.slice(0, 50)) {
    assert.ok(entry.teamSlug === null || slugs.has(entry.teamSlug), `unknown team ${entry.teamSlug}`);
  }
  // Long-term rule: IR always qualifies; OUT needs 3+ weeks; 2 weeks never does.
  assert.ok(injury.isLongTerm({ status: "IR", weeksOut: null }));
  assert.ok(injury.isLongTerm({ status: "OUT", weeksOut: 3 }));
  assert.ok(!injury.isLongTerm({ status: "OUT", weeksOut: 2 }));
  assert.ok(!injury.isLongTerm({ status: "QUESTIONABLE", weeksOut: null }));
  // Practice-status likelihood model is deterministic and explainable.
  assert.equal(injury.likelihoodFromPractice({ wed: null, thu: "FP", fri: "FP", sat: null }).likelihood, "likely");
  assert.equal(injury.likelihoodFromPractice({ wed: null, thu: null, fri: "DNP", sat: null }).likelihood, "doubtful");
  assert.equal(injury.likelihoodFromPractice({ wed: null, thu: null, fri: null, sat: null }).likelihood, null);
  // Cadence: every slot exists and the next slot is always in the future.
  assert.equal(injury.INJURY_CADENCE.length, 4);
  const next = injury.nextInjurySlot();
  assert.ok(next.at.getTime() > Date.now());
  const wednesday = new Date("2026-09-09T18:00:00Z"); // 11 AM PT Wednesday
  const afterWed = injury.nextInjurySlot(wednesday);
  assert.ok(afterWed.at.getTime() > wednesday.getTime());
  // Editorial layer ships empty until research lands (fail-closed).
  assert.equal(injury.injuryResearch.ledger.length, 0);
  assert.equal(injury.injuryResearch.watch.length, 0);
});

test("dataset records are provenance-tagged and never claim live status", () => {
  assert.ok(games.every((game) => game.provenance.dataEnvironment === "production"));
  assert.ok(games.every((game) => game.provenance.licenseClass === "R2_LINK_ONLY"));
  assert.ok(games.every((game) => !game.statusDetail.toLowerCase().includes("live")));
  assert.equal(
    providerHealth.find((provider) => provider.id === "espn-nfl")?.status,
    "operational",
  );
});
