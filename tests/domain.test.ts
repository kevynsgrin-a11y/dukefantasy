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
  const { ticketLinksForTeam, ticketAffiliatesConfigured } = await import("../lib/affiliates.ts");
  if (!ticketAffiliatesConfigured) {
    assert.deepEqual(ticketLinksForTeam("Kansas City Chiefs"), []);
  } else {
    for (const link of ticketLinksForTeam("Kansas City Chiefs")) {
      assert.match(link.url, /^https:\/\//);
      assert.ok(link.url.includes("url="), "affiliate wrapper must encode the destination");
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

test("dataset records are provenance-tagged and never claim live status", () => {
  assert.ok(games.every((game) => game.provenance.dataEnvironment === "production"));
  assert.ok(games.every((game) => game.provenance.licenseClass === "R2_LINK_ONLY"));
  assert.ok(games.every((game) => !game.statusDetail.toLowerCase().includes("live")));
  assert.equal(
    providerHealth.find((provider) => provider.id === "espn-nfl")?.status,
    "operational",
  );
});
