import { coaches, games, portalEvents, stadiums, teams } from "../lib/cfb-dataset.ts";

const counts = {
  teams: teams.length,
  games: games.length,
  portalEvents: portalEvents.length,
  coaches: coaches.length,
  stadiums: stadiums.length,
};

// Portal, stadium, and coaching surfaces are intentionally empty in the NFL
// build (ESPN schedule snapshot only); teams and games must always be present.
if (counts.teams === 0 || counts.games === 0) {
  throw new Error("Dataset pack is incomplete.");
}

console.log("Dataset seed check: PASS", counts);
