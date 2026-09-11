# DukeFantasy — Open Research Prompts

Every research prompt still unaddressed for dukefantasy.com as of 2026-09-09.
Copy each fenced block verbatim into Deep Research (or the fast agent where
noted). One prompt per block — the START/END markers bound each insertion.

## Status board

| # | Prompt | Fills | Cadence | Status |
|---|--------|-------|---------|--------|
| 1 | Weekly DFS Projections + Fantasy Notes | /dfs projections board | Weekly (Sat, after final injury report) | Open — board shows "publish before kickoff" |
| 2 | Past-Week DFS Results (grading data) | /dfs accuracy ledger | Weekly (Tue) | Open — powers hit rate / MAE / bias |
| 3 | Weekly Injury Report — main compile | /injuries editorial layer | Weekly (Tue) | Prompt delivered 2026-09-09, not yet run |
| 4 | Sunday Watch Sweep | /injuries | Sunday 9:30 AM + 12:30 PM PT | Prompt delivered, not yet run |
| 5 | Monday Pre-MNF Sweep | /injuries (MNF teams only) | Monday 4:30 PM PT | Prompt delivered, not yet run |
| 6 | Injury Cross-Check Audit | quality gate | After each Tuesday compile | Prompt delivered, not yet run |
| 7 | X & Ys Weekly Film Room companion | /x-and-ys spotlight (5 cut-ups) | Weekly (Tue after the week completes) | Open — spotlight shows "opens after Week 1" |
| 8 | X & Ys Scheme-Family Verification | one-time audit of /x-and-ys macro mapping | Once, then mid-season | Open — editorial mapping needs a fact-check |
| 9 | NFL Rosters + Depth Charts | team hub roster sections, player pages, search | Once + weekly deltas (Wed) | Open — team pages show "not published" |
| 10 | NFL Transactions Wire | /transfer-portal transaction board | Weekly (Wed) | Open — board is empty |
| 11 | Waiver Wire Watch | /fantasy-desk waiver section | Weekly (Tue after MNF; first edition Sep 15 for Week 2) | Open — new 2026-09-11 |
| 12 | Start/Sit Tier Board | /fantasy-desk start-sit section | Weekly (Thu; first edition before Week 1 Sunday) | Open — new 2026-09-11 |
| 13 | Rookie Usage Report | /fantasy-desk rookie section | Weekly (Tue; first data after Week 1) | Open — new 2026-09-11 |
| 14 | Trade Value Big Board | /fantasy-desk trade section | Weekly (Wed; meaningful from Week 2) | Open — new 2026-09-11 |

---

## PROMPT 1 — Weekly DFS Projections + Fantasy Notes (run Saturdays, after the final injury report)

```
==================== PROMPT START ====================
Compile the DukeFantasy DFS Projections board for Week [N] of the 2026 NFL
season as of [DATE, SATURDAY]. Every projection publishes pre-lockup and is
never edited after kickoff — so only include calls you can stand behind
with sources.

For each position (QB, RB, WR, TE, FLEX, DST) rank the top 10 AND any
notable bust-or-value calls outside the top 10 (max ~60 players total).
For each: player, team_slug (ESPN-style slug, e.g. "kansas-city-chiefs"),
position, opponent_slug, projected_points (your projection WITH stated
method: aggregate of named analyst projections — average at least 3 named
fantasy outlets and show the inputs; if fewer than 3 exist, say so and
mark confidence lower), projected_rank (1–10 within position, or null
outside the top 10), note (2–3 sentences: usage expectation, matchup,
weather, injury context — all sourced), sources (URLs to the analyst
projections and injury reports used), confidence ("high"|"medium"|"low").

RULES: this site grades itself on the same ledger — projections must be
reproducible from the cited sources. Never present a single outlet's
number as a consensus. If the Saturday injury report leaves a player's
status unresolved, say exactly that in the note. No salaries, no betting
lines, no ownership percentages.

OUTPUT: one JSON code block, nothing else:
{"week": N, "as_of": "YYYY-MM-DD", "projections": [{"player": "",
"team_slug": "", "position": "QB|RB|WR|TE|FLEX|DST", "opponent_slug": "",
"projected_points": 0.0, "projected_rank": null, "note": "", "sources":
[""], "confidence": ""}], "methodology_note": ""}
==================== PROMPT END ====================
```

---

## PROMPT 2 — Past-Week DFS Results (run Tuesdays)

```
==================== PROMPT START ====================
Compile the DukeFantasy grading data for Week [N] of the 2026 NFL season
(games [DATE RANGE], as of [DATE]). This grades our published projections,
so precision matters more than speed.

Using official box scores (NFL.com/ESPN/Pro Football Reference — cite
which), for every player in the Week [N] published projection set report:
player, team_slug, position, projected_points and projected_rank EXACTLY
as published pre-lockup (do not adjust them), actual_points (standard
half-PPR fantasy scoring for QB/RB/WR/TE; state the scoring settings you
used), actual_rank (the player's rank at their position by actual_points
among ALL players who played that week at the position — not just the
projected set), and scoring_source.

Also report the weekly context: weather cancellations, late scratches
with the timing of the downgrade (pre- or post-lockup), and any stat
corrections issued after the games.

RULES: actuals must match the box score of record. If a projection for a
player exists but the player did not play, actual_points is 0 and a note
explains why (inactive/IR/trade). Two-source preference for every actual.

OUTPUT: one JSON code block, nothing else:
{"week": N, "as_of": "YYYY-MM-DD", "scoring": "half-PPR", "results":
[{"player": "", "team_slug": "", "position": "", "projected_points": 0.0,
"projected_rank": null, "actual_points": 0.0, "actual_rank": null,
"note": "", "scoring_source": ""}], "context_notes": ""}
==================== PROMPT END ====================
```

---

## PROMPT 3 — Weekly Injury Report, Main Compile (weekly, run Tuesdays)

```
==================== PROMPT START ====================
Compile a verified weekly NFL injury intelligence report for Week [N] of
the 2026 season as of [DATE].

LEDGER (long-term only): every player in the league who is (a) on Injured
Reserve, reserve/PUP, reserve/NFI, or out-for-season, OR (b) officially
expected to miss MORE than 2 weeks from today. Do NOT include week-to-week
or game-time decisions here — if a player is only ruled out for this
week's game, they belong in WATCH. For each: player, team_slug (ESPN-style
slug, e.g. "kansas-city-chiefs"), position, injury (as publicly described,
e.g. "right ankle sprain"), status ("IR" or "OUT"), weeks_out
(best-supported public estimate; null if not reported), detail (1–2
sentence factual note), sources (1–2 URLs), confidence ("high" = official
team transaction/release, "medium" = multiple beat reporters, "low" =
single report).

WATCH (week-to-week): every player with a published practice status or
credible availability question for this week. For each: player, team_slug,
position, injury, practice statuses for Wednesday/Thursday/Friday/Saturday
(only "DNP", "LP", "FP", or null — null when the day hasn't happened or
wasn't reported), likelihood ("likely" | "questionable" | "doubtful" |
"unlikely"), confidence ("high" | "medium" | "low"), note (the evidence:
beat report quotes, coach statements, verified X/Instagram posts from the
player or team — link the specific post), sources (URLs), social
(verified-account post URLs).

RULES: Use only publicly published information — team releases, official
injury/practice reports, credentialed beat reporters, and verified
player/team social accounts (X, Instagram). NEVER use unverified
aggregator or fan accounts as a likelihood source. A likelihood grade
without a citable source is invalid — mark it null instead. Sentiment
must be evidence: a beat reporter writing "he looked good in the portion
open to media" supports "likely/medium"; a player's verified X post about
being ready supports the grade and goes in "social". Null means not
published — never guess, never zero-fill. Two-source preference for
anything graded "high".

OUTPUT: one JSON code block, nothing else:
{"week": N, "as_of": "YYYY-MM-DD", "ledger": [{"player": "", "team_slug":
"", "position": "", "injury": "", "status": "IR|OUT", "weeks_out": null,
"detail": "", "sources": [""], "confidence": ""}], "watch": [{"player": "",
"team_slug": "", "position": "", "injury": "", "practice_wed": null,
"practice_thu": null, "practice_fri": null, "practice_sat": null,
"likelihood": "", "confidence": "", "note": "", "sources": [""], "social":
[""]}]}
==================== PROMPT END ====================
```

---

## PROMPT 4 — Sunday Watch Sweep (fast agent / Grok, Sunday mornings)

```
==================== PROMPT START ====================
Delta update for Week [N] NFL injury WATCH entries only, as of Sunday
[DATE]. Check ONLY: (1) official game-day actives/inactives lists as they
publish (~90 minutes before each kickoff), (2) final practice reports for
starters and fantasy-relevant skill players, (3) verified X posts from
players/coaches/teams declaring status this morning, (4) credible
beat-reporter morning updates. Output ONLY the players whose status
changed since Friday: JSON watch objects with the exact schema (player,
team_slug, position, injury, practice_wed, practice_thu, practice_fri,
practice_sat — each "DNP"|"LP"|"FP"|null — likelihood, confidence, note,
sources, social). If nothing has changed, output {"week": N, "as_of":
"DATE", "watch": [], "note": "no material changes since Friday"}. Same
sourcing rules: published info, verified accounts, likelihood requires a
source, never speculate.
==================== PROMPT END ====================
```

---

## PROMPT 5 — Monday Pre-MNF Sweep (fast agent, Monday ~4:00 PM PT)

```
==================== PROMPT START ====================
Delta update for Week [N] NFL injury WATCH entries, Monday [DATE], scoped
to the two teams playing Monday Night Football ([TEAM A] at [TEAM B]).
Check ONLY: (1) the teams' final official injury/designations reports and
practice participation today, (2) verified X posts from the players,
coaches, or team accounts today, (3) credible beat-reporter updates from
today. Output ONLY players on these two rosters whose status changed this
weekend, as JSON watch objects (player, team_slug, position, injury,
practice_wed, practice_thu, practice_fri, practice_sat — each
"DNP"|"LP"|"FP"|null — likelihood, confidence, note, sources, social).
If nothing material changed for either MNF team, output {"week": N,
"as_of": "DATE", "watch": [], "note": "no material changes for MNF teams"}.
Published info only, verified accounts only, never speculate.
==================== PROMPT END ====================
```

---

## PROMPT 6 — Injury Cross-Check Audit (quality gate, after each Tuesday compile)

```
==================== PROMPT START ====================
Audit this Week [N] NFL injury compilation against primary sources. For a
random sample of at least 25 ledger entries and 25 watch entries:
(1) verify each source URL actually states what the entry claims,
(2) confirm team_slug matches the franchise, (3) flag any likelihood grade
where the cited evidence does not support the stated confidence level,
(4) flag any player missing from the ledger who appears on an official
IR/PUP/NFI/out-for-season list, (5) check the watch for fabricated
practice statuses — the entry must cite a practice/injury report if any
practice day is non-null. Output: a table of discrepancies (field,
claimed, actual, corrected value, source URL), then a corrected full JSON
with the same schema applying every verified fix. State the sample size
and pass rate.
==================== PROMPT END ====================
```

---

## PROMPT 7 — X & Ys Weekly Film Room Companion (run Tuesdays, after the week completes)

```
==================== PROMPT START ====================
Compile the DukeFantasy X & Ys Weekly Film Room lineup for Week [N] of the
2026 NFL season (games [DATE RANGE], as of [DATE]). Deliver exactly 5
spotlight cut-up briefs — five is the sweet spot; every cut-up must earn
its place.

Selection: the week's five most instructive BIG PLAYS by recognized top
playmakers (players widely regarded among the league's elite — Pro Bowlers,
All-Pros, or consensus top-10 at their position). Prefer plays that
demonstrate a recognizable offensive concept over raw athleticism alone.
Diversity across concepts and teams beats five plays from one game.

For each cut-up (order 1–5, most instructive first): title (short, names
the concept), playmaker (player name), team_slug (ESPN-style slug),
concept (must be one of these library IDs: mesh, flood, levels,
four-verticals, mills, scissors, spacing, smash, curl-flat, dagger,
stick, screens, inside-zone, wide-zone, duo, power, counter, pin-pull,
split-zone, wham, jet-motion, qb-run), description (3–5 sentences of
actual film breakdown: the pre-snap look, who ran what, the blocking,
the read, why the concept won — technical, specific, no hype language),
video_url (a link to OFFICIALLY LICENSED highlight footage of the play —
NFL.com, the teams' official channels, or the league's official YouTube —
never a re-upload or bootleg account; null if no licensed clip exists),
and sources (box score or recap confirming the play).

RULES: only plays that actually happened in the stated week. The concept
tag must be technically accurate — if a play doesn't map cleanly to a
library concept, pick a different play. Breakdowns describe what happened
on the field; they never speculate about play calls being wrong or grade
coaching.

OUTPUT: one JSON code block, nothing else:
{"week": N, "as_of": "YYYY-MM-DD", "spotlights": [{"order": 1, "title":
"", "playmaker": "", "team_slug": "", "concept": "", "description": "",
"video_url": null, "sources": [""]}]}
==================== PROMPT END ====================
```

---

## PROMPT 8 — X & Ys Scheme-Family Verification (one-time audit, then mid-season re-check)

```
==================== PROMPT START ====================
Fact-check the DukeFantasy X & Ys scheme-family mapping for the 2026 NFL
season as of [DATE]. The site currently maps these families to teams:

- Wide Zone Tree (Shanahan–McVay–LaFleur lineage): san-francisco-49ers,
  los-angeles-rams, miami-dolphins, green-bay-packers
- West Coast Hybrid (Reid-lineage motion and timing): kansas-city-chiefs
- Power–RPO (gap power married to RPOs and QB-run threat):
  philadelphia-eagles, baltimore-ravens
- Vertical Shot Offense (Air Coryell derivatives): cincinnati-bengals,
  buffalo-bills
- Spread Improvisation (QB-driven modern spread): buffalo-bills,
  baltimore-ravens, washington-commanders

For each family: (1) verify each mapped team's 2026 offensive identity
still matches the family description, citing current offensive
coordinator/head coach and credible scheme analysis (beat writers,
Football Outsiders/FTN-style analysis, training-camp reports); (2) flag
any 2026 coaching change that materially shifted a team's scheme;
(3) identify up to 3 teams NOT currently mapped whose 2026 identity
clearly fits a family (with sourcing); (4) verify each family's
runIdentity/passIdentity descriptions remain accurate for 2026.

Teams may legitimately belong to multiple families — flag only genuine
mismatches. Output: a discrepancy table (family, team_slug, issue,
evidence, recommended action), then a corrected full JSON:
{"as_of": "YYYY-MM-DD", "families": [{"id": "", "name": "", "lineage":
"", "thesis": "", "runIdentity": "", "passIdentity": "", "teamSlugs":
[""]}], "changes_note": ""}
==================== PROMPT END ====================
```

---

## PROMPT 9 — NFL Rosters + Depth Charts (one-time full compile, then weekly deltas)

```
==================== PROMPT START ====================
Compile the DukeFantasy roster and depth chart baseline for the 2026 NFL
season as of [DATE]. For all 32 teams:

ROSTER: the current 53-man roster as published by the team or NFL
communications. For each player: name, position (official roster
designation), jersey number, status note if not active (IR/PUP/suspended
with the list date). Group players by position group (QB/RB/WR/TE/OL/
DL/LB/CB/S/ST) within each team.

DEPTH CHART: the team's CURRENT published depth chart (the team's own
official depth chart where it exists; otherwise the latest credible
published projection from camp/preseason, cited). For each position:
the ordered string (starter first), with co-starters marked as such when
the source lists them ("OR"). Note the scheme fit only if the source
states it (e.g. "zone-blocking line" per the team's beat writer).

Use team_slug = ESPN-style slug for every team. Every roster/depth claim
cites its source (team site, NFL communications, or named outlet) with
the as-of date. Rosters below 53 (early-season moves) are reported as
they are — never pad.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "teams": [{"team_slug": "", "head_coach": "",
"position_groups": [{"name": "QB", "players": [{"name": "", "position":
"", "jersey": null, "status": "active|IR|PUP|suspended", "status_note":
""}]}], "depth_chart": [{"position": "", "ordered": ["Starter", "Backup"],
"co_starters": false, "source": ""}], "sources": [""]}]}
==================== PROMPT END ====================
```

---

## PROMPT 10 — NFL Transactions Wire (run Wednesdays)

```
==================== PROMPT START ====================
Compile the DukeFantasy transactions wire for Week [N] of the 2026 NFL
season — every roster move officially announced or credibly reported in
the last 7 days as of [DATE]: trades, free-agent signings (to the 53 or
practice squad), waiver claims, releases, IR/PUP/NFI designations and
activations, suspensions and reinstatements, retirements.

For each move: player, from_team_slug (null for street free agents),
to_team_slug, position, transaction_type ("trade"|"signing"|"waiver-
claim"|"release"|"ir"|"ir-activation"|"suspension"|"reinstatement"|
"retirement"), date announced (YYYY-MM-DD), status ("official" if the
league transaction wire or team announced it; "reported" if only media),
detail (1 sentence — terms ONLY as publicly reported, e.g. draft
compensation in a trade; null if not disclosed), sources (1–2 URLs),
confidence ("high" = official announcement, "medium" = multiple national/
beat reporters, "low" = single report).

RULES: official league transaction wire and team announcements outrank
everything. Trade terms that were not disclosed are null — never estimate
pick value. One entry per move; a trade generates entries for each player
traded.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "moves": [{"player": "", "from_team_slug":
null, "to_team_slug": "", "position": "", "transaction_type": "", "date":
"", "status": "official|reported", "detail": null, "sources": [""],
"confidence": ""}]}
==================== PROMPT END ====================
```

---

## PROMPT 11 — Waiver Wire Watch (run Tuesdays after MNF; first edition Tuesday Sep 15)

```
==================== PROMPT START ====================
Compile the DukeFantasy Waiver Wire Watch for Week [N+1] of the 2026 NFL
season, covering the games of [WEEK N DATES]. Target audience: redraft and
half-PPR leagues (note PPR differences where material). Only include players
rostered in fewer than 55% of ESPN leagues (verify ownership on ESPN or
FantasyPros; if a number is unavailable, set it to null — never estimate).

Deliver, per position (QB, RB, WR, TE, DST, K): the top adds — 3 QB, 6 RB,
6 WR, 3 TE, 2 DST, 2 K. For each: name, team, position, ESPN ownership %,
one-line why (usage change, injury replacement, role change, matchup),
confidence (high/medium/low), and whether they are a one-week stream or a
rest-of-season hold. Also: 5 drop candidates (rostered >60%, losing role)
and one priority-spend note (when to burn the top claim vs. FAAB guidance).

Rules: base every claim on Week [N] usage or verified role news — no
preseason narratives. Two sources per player minimum; list them. Null means
not published; never invent a number.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week_adding_for": N, "adds": [{"player": "",
"team_slug": "", "position": "", "ownership_pct": null, "why": "",
"hold": "stream|rest_of_season", "confidence": "", "sources": [""]}],
"drops": [{"player": "", "team_slug": "", "why": "", "sources": [""]}],
"priority_note": ""}
==================== PROMPT END ====================
```

## PROMPT 12 — Start/Sit Tier Board (run Thursdays; first edition before the Week 1 Sunday slate)

```
==================== PROMPT START ====================
Compile the DukeFantasy Start/Sit Tier Board for Week [N] of the 2026 NFL
season as of [THURSDAY DATE]. Tiers, not rankings: within a tier the call is
a coin flip, so readers sit the tier above the fringe. One line per player,
decision-first.

Deliver per position (QB, RB, WR, TE, flex, DST): Tier "Start with
confidence", Tier "Start if you need it", Tier "Fringe — size of the
target", Tier "Sit". Cover the fantasy-relevant names (top ~12 QB, ~30 RB,
~40 WR, ~15 TE, ~10 DST) plus 5 explicit "tough call" callouts — the
players most rostered in the flex range — each with a one-sentence verdict
that names the reason (matchup, usage risk, weather if verified).

Rules: no numbers you cannot source (projections stay on the DFS board —
this is decisions, not projections). Weather only if a verified forecast
exists; otherwise omit. Null means not published.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "positions": [{"position": "QB",
"tiers": [{"tier": "start_confidence|start_if_needed|fringe|sit",
"players": [{"player": "", "team_slug": "", "note": ""}]}]}],
"tough_calls": [{"player": "", "team_slug": "", "verdict": ""}]}
==================== PROMPT END ====================
```

## PROMPT 13 — Rookie Usage Report (run Tuesdays; first data after Week 1 completes)

```
==================== PROMPT START ====================
Compile the DukeFantasy Rookie Usage Report for Week [N] of the 2026 NFL
season (games of [WEEK N DATES]). Scope: every skill-position rookie (QB/RB/
WR/TE) drafted in the 2026 class who logged an offensive snap in Week [N],
plus any notable UDFA with 10+ snaps.

For each: name, team, position, draft round, snap share % (offensive snaps
/ team offensive snaps), targets or carries, usage trend vs. prior week
(rising/steady/fading) with a one-line why, and a fantasy meaning (waiver
relevant / bench stash / dynasty only). Verify snap counts against the box
score (ESPN/NFL.com Next Gen or similar); if snap share cannot be computed,
publish snaps and team snaps separately and null the share.

Rules: usage only — no projections. Two sources per player. Null means not
published; never estimate.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "rookies": [{"player": "", "team_slug":
"", "position": "", "draft_round": null, "snaps": null, "team_snaps": null,
"snap_share_pct": null, "targets_or_carries": null, "trend":
"rising|steady|fading", "why": "", "fantasy_meaning":
"waiver_relevant|bench_stash|dynasty_only", "sources": [""]}]}
==================== PROMPT END ====================
```

## PROMPT 14 — Trade Value Big Board (run Wednesdays; meaningful from Week 2)

```
==================== PROMPT START ====================
Compile the DukeFantasy Trade Value Big Board for Week [N] of the 2026 NFL
season as of [WEDNESDAY DATE]. Rest-of-season trade values, redraft
half-PPR context (note superflex QB inflation separately if material).

Deliver one ordered board per position group (QB, RB, WR, TE) covering the
fantasy-relevant names, each with: value tier (1-5), one-line basis
(usage, role, injury risk, schedule), and a market tag — buy-low,
sell-high, or fair. Then 5 swing trades: the concrete player-for-player
deals worth making this week, each with the rationale for both sides.

Rules: values must be internally consistent (a tier-2 RB never ranks below
a tier-3 RB) and grounded in verified season usage — Week [N] overreactions
are the market to exploit, not the analysis. Two sources where a claim of
fact appears. Null means not published.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "boards": [{"position": "QB", "rows":
[{"player": "", "team_slug": "", "tier": 1, "basis": "", "market":
"buy_low|sell_high|fair"}]}], "swing_trades": [{"give": "", "get": "",
"rationale": ""}]}
==================== PROMPT END ====================
```

## After results arrive

- **Injuries (Prompts 3–6):** drop the JSON into `data/injury-research/inbox/`
  — `scripts/ingest-injury-research.mjs` validates and stages it, and the
  scheduled Sunday/Monday automations (once created) or a chat run builds
  and deploys.
- **Everything else:** paste the JSON in chat — ingestion adapters for the
  DFS ledger, film room, rosters, and transactions wire follow the same
  fail-closed, two-source, null-means-unpublished pipeline as the boards
  already live.
