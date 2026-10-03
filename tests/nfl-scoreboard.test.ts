import assert from "node:assert/strict";
import test from "node:test";
import {
  espnEventToNflEvent,
  mapEspnScoreboard,
  mapEspnStatus,
  scoreboardWindowDays,
  type EspnRawEvent,
} from "../lib/nfl-scoreboard.ts";

function espnFixture(overrides: Partial<EspnRawEvent> = {}): EspnRawEvent {
  return {
    id: "401912345",
    date: "2026-10-04T17:30Z",
    status: { type: { state: "pre", completed: false, detail: "Scheduled", shortDetail: "Sun 1:30 PM" } },
    competitions: [
      {
        venue: { fullName: "Northwest Stadium" },
        competitors: [
          { homeAway: "away", score: "", team: { abbreviation: "IND", shortDisplayName: "Indianapolis", displayName: "Indianapolis Colts" } },
          { homeAway: "home", score: "", team: { abbreviation: "WAS", shortDisplayName: "Washington", displayName: "Washington Commanders" } },
        ],
      },
    ],
    ...overrides,
  };
}

test("maps a scheduled game with null scores and a kickoff detail", () => {
  const event = espnEventToNflEvent(espnFixture());
  assert.ok(event);
  assert.equal(event.id, "401912345");
  assert.equal(event.away, "Indianapolis");
  assert.equal(event.home, "Washington");
  assert.equal(event.state, "scheduled");
  assert.equal(event.homeScore, null);
  assert.equal(event.awayScore, null);
  assert.equal(event.venue, "Northwest Stadium");
  assert.equal(event.statusLabel, "Sun 1:30 PM");
});

test("maps an in-progress game to live with integer scores", () => {
  const event = espnEventToNflEvent(
    espnFixture({
      status: { type: { state: "in", completed: false, detail: "Q3 - 5:42", shortDetail: "Q3 5:42" } },
      competitions: [
        {
          competitors: [
            { homeAway: "away", score: "17", team: { abbreviation: "IND", shortDisplayName: "Indianapolis" } },
            { homeAway: "home", score: "20", team: { abbreviation: "WAS", shortDisplayName: "Washington" } },
          ],
        },
      ],
    }),
  );
  assert.ok(event);
  assert.equal(event.state, "live");
  assert.equal(event.awayScore, 17);
  assert.equal(event.homeScore, 20);
  assert.equal(event.statusLabel, "Q3 5:42");
});

test("halftime maps to its own state and completed post-game maps to final", () => {
  assert.equal(mapEspnStatus("in", false, "Halftime"), "halftime");
  assert.equal(mapEspnStatus("post", true, "Final"), "final");
  assert.equal(mapEspnStatus("post", false, "Postponed"), "postponed");
  assert.equal(mapEspnStatus("post", false, "Canceled"), "canceled");
  assert.equal(mapEspnStatus("pre", false, "Scheduled"), "scheduled");
});

test("drops events without the identifying fields", () => {
  assert.equal(espnEventToNflEvent({ id: null, date: "2026-10-04T17:30Z" }), null);
  assert.equal(espnEventToNflEvent({ id: "1", date: null }), null);
  assert.equal(
    espnEventToNflEvent({ id: "1", date: "2026-10-04T17:30Z", competitions: [{}] }),
    null,
  );
});

test("dedupes repeated events across window days and sorts by kickoff", () => {
  const later = espnFixture({ id: "401912346", date: "2026-10-04T21:00Z" });
  const events = mapEspnScoreboard([later, espnFixture(), later]);
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((event) => event.id),
    ["401912345", "401912346"],
  );
});

test("falls back to abbreviation then display name for team labels", () => {
  const event = espnEventToNflEvent(
    espnFixture({
      competitions: [
        {
          competitors: [
            { homeAway: "away", score: "3", team: { abbreviation: "LV" } },
            { homeAway: "home", score: "7", team: { displayName: "Kansas City Chiefs" } },
          ],
        },
      ],
    }),
  );
  assert.ok(event);
  assert.equal(event.away, "LV");
  assert.equal(event.home, "Kansas City Chiefs");
});

test("window days are Eastern game dates, two back through one ahead", () => {
  // 18:00Z on Saturday Oct 3 is 14:00 ET Saturday Oct 3: the window must
  // reach back to Thursday Oct 1 (Thursday-night football lives on the ET
  // day, not the UTC day) and forward to the Sunday slate.
  const saturday = scoreboardWindowDays(new Date("2026-10-03T18:00:00Z"));
  assert.deepEqual(saturday, ["20261001", "20261002", "20261003", "20261004"]);
  // Late-night UTC is already the next ET day: 03:00Z Sunday is 23:00 ET
  // Saturday, so the window centers on the ET Saturday.
  const lateNightUtc = scoreboardWindowDays(new Date("2026-10-04T03:00:00Z"));
  assert.deepEqual(lateNightUtc, ["20261001", "20261002", "20261003", "20261004"]);
  // Month boundary: ET Nov 1 window reaches back into October.
  const monthEdge = scoreboardWindowDays(new Date("2026-11-01T18:00:00Z"));
  assert.deepEqual(monthEdge, ["20261030", "20261031", "20261101", "20261102"]);
});
