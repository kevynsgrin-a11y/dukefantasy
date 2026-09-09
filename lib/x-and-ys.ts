/**
 * X & Ys — the film-room data layer.
 *
 * The concept library and scheme-family mapping are editorial education
 * content (our own taxonomy, written for this site). The weekly spotlight
 * slots stay null/pending until real cut-ups exist — we never publish
 * placeholder plays or invented video links. Highlight videos link out to
 * officially licensed sources; we do not re-host NFL footage.
 */

export type ConceptSide = "pass" | "run";

export interface OffensiveConcept {
  id: string;
  name: string;
  side: ConceptSide;
  family: string;
  macro: string;
  micro: string;
  beats: string;
  tags: string[];
}

export interface SchemeFamily {
  id: string;
  name: string;
  lineage: string;
  thesis: string;
  runIdentity: string;
  passIdentity: string;
  /** Dataset team slugs — validated against the 32-team roster in tests. */
  teamSlugs: string[];
}

export interface TechniquePrimer {
  id: string;
  title: string;
  unit: "Quarterback" | "Receivers" | "Offensive line" | "Team";
  body: string;
}

export interface WeeklySpotlight {
  week: number;
  order: number;
  title: string;
  /** null until a real cut-up is produced and hosted. */
  videoUrl: string | null;
  playmaker: string | null;
  teamSlug: string | null;
  conceptId: string | null;
  description: string | null;
  publishedAt: string | null;
}

export const CONCEPT_LIBRARY: OffensiveConcept[] = [
  {
    id: "mesh",
    name: "Mesh",
    side: "pass",
    family: "West Coast timing",
    macro: "Two shallow crossers scrub across the middle at 5–6 yards, dragging man defenders through the wash while the rest of the formation clears space behind them. It is the league's most durable man-beater and the spine of most West Coast derivatives.",
    micro: "Crossers must run flat enough to brush shoulders — the legal rub is the concept. The QB takes a five-step hitch and throws the crosser coming to him, away from the chasing defender. Versus zone, the crosser settles into the vacated window and the QB works the checkdown over the top.",
    beats: "Man coverage, especially man under two-deep safeties.",
    tags: ["man beater", "timing", "rub principle"],
  },
  {
    id: "flood",
    name: "Flood (3-Man Sail)",
    side: "pass",
    family: "Vertical-stretch tree",
    macro: "Three routes attack one sideline at three depths — deep corner, intermediate out, flat. One defender cannot cover three levels of the same half-field, so the flood forces a choice and the QB takes whatever level the cornerback concedes.",
    micro: "The corner route must get depth before breaking to the pylon; the out runs at 12 yards on the same stem; the flat runner attacks the line of scrimmage. Versus Cover 3 the read is the flat defender: he sinks, throw flat; he squeezes, throw the out.",
    beats: "Cover 3 and single-high zones with a run-first flat defender.",
    tags: ["flood", "high-low", "Cover 3 beater"],
  },
  {
    id: "levels",
    name: "Levels",
    side: "pass",
    family: "West Coast timing",
    macro: "Two crossers run at the same shallow depth from opposite sides with a checkdown sitting behind them — a horizontal stretch that moves the underneath zone defenders faster than they can slide.",
    micro: "Crossers hold the same depth so the two hook defenders cannot pass either off. The QB reads the near hook defender: he chases the first crosser, throw the second; he stalls, throw the first. The checkdown catches anything the crossers push back.",
    beats: "Two-deep zone shells with four underneath defenders.",
    tags: ["horizontal stretch", "zone beater", "timing"],
  },
  {
    id: "four-verticals",
    name: "Four Verticals",
    side: "pass",
    family: "Vertical-stretch tree",
    macro: "Four receivers run up the seams, turning the middle of the field open MOFO (middle-of-field-open) or closed MOFC into a math problem: two deep defenders cannot cover four vertical lanes.",
    micro: "Seam runners bow away from the hashes and stack on top of the safeties. Versus MOFO the QB throws the seam past the rotated safety; versus MOFC the middle runner sits behind the single-high look. The ball comes out on rhythm, not on a covered look.",
    beats: "Single-high and two-high shells that declare early.",
    tags: ["vertical stretch", "seams", "shot play"],
  },
  {
    id: "mills",
    name: "Mills (Double Post)",
    side: "pass",
    family: "Vertical-stretch tree",
    macro: "A post at 12–14 yards attacks the safety's help side while a second, deeper post runs behind him — the two-man game that punishes single-high defenses for staring at the first break.",
    micro: "The short post sells a dig before breaking; the deep post stays on the safety's outside hip the whole way. The QB holds the safety with his eyes: if the safety drives the first post, the second post is thrown over the top, in stride.",
    beats: "Single-high coverage with an aggressive post safety.",
    tags: ["double move", "deep shot", "single-high beater"],
  },
  {
    id: "scissors",
    name: "Scissors (Crossers)",
    side: "pass",
    family: "Play-action tree",
    macro: "A deep crosser and a deeper over route cross at 16–20 yards, stretching the safeties laterally at depth. It is the classic deep companion to wide-zone play action.",
    micro: "The crosser runs away from his alignment at 16; the over route crosses his face behind him at 20. The QB's footwork comes from the run game, and the throw goes to whichever route the backside safety stops respecting. Protection must hold the extra half-second.",
    beats: "Two-high zones that roll away from play action.",
    tags: ["play action", "deep crossers", "wide-zone companion"],
  },
  {
    id: "spacing",
    name: "Spacing",
    side: "pass",
    family: "Quick-game tree",
    macro: "Three receivers form a triangle at stick depth — sit, sit, and a short route underneath — occupying every underneath defender in a zone with no vertical threat needed.",
    micro: "Sits settle at 5–6 yards in the grass between zone landmarks, spaced so one defender cannot cover two. The catch-and-throw happens on the snap's rhythm; the QB reads inside-out and delivers before the second-level reaction.",
    beats: "Zone coverage in obvious passing downs and red-zone snaps.",
    tags: ["quick game", "triangle", "red zone"],
  },
  {
    id: "smash",
    name: "Smash",
    side: "pass",
    family: "Quick-game tree",
    macro: "A stop route at 4 yards with a corner route behind it — a two-level high-low on the outside cornerback that turns quarters and Cover 2 corners into wrong-answer machines.",
    micro: "The stop route must get the corner to settle with his eyes in the backfield; the corner route bends at 45 degrees immediately off the stop's break. If the corner squats on the stop, throw the corner route over his head; if he retreats, take the stop and the yards.",
    beats: "Cover 2 and quarters with a squatting outside corner.",
    tags: ["high-low", "quarters beater", "red zone"],
  },
  {
    id: "curl-flat",
    name: "Curl–Flat",
    side: "pass",
    family: "West Coast timing",
    macro: "The league's most-thrown concept: a curl settling at 12–14 with a flat runner stretching underneath. It is a two-man high-low that works versus nearly everything because the curl reads the defender instead of the coverage.",
    micro: "The curl pushes to depth, thwarts, and settles facing the QB in the window the flat defender abandons. The QB's eyes take the flat defender low-to-high: he runs flat, throw the curl; he sits, throw the flat. Timing is three-step, ball out on the hitch.",
    beats: "Nearly universal — the constraint that makes the whole tree work.",
    tags: ["staple", "high-low", "timing"],
  },
  {
    id: "dagger",
    name: "Dagger",
    side: "pass",
    family: "Vertical-stretch tree",
    macro: "A seam route clears the second level while a dig crosses behind it at 14–16 — a vertical stretch of the two deep defenders that also gives the QB a defined throw versus man.",
    micro: "The seam must threaten the safety's outside shoulder before the dig crosses his face. The QB reads the far safety: if he opens to the seam, throw the dig in the vacated lane; if he stays put, the seam is thrown up the numbers.",
    beats: "Two-high shells and man coverage with single-high help.",
    tags: ["seam-dig", "two-high beater", "progression"],
  },
  {
    id: "stick",
    name: "Stick",
    side: "pass",
    family: "Quick-game tree",
    macro: "A three-man side with a stick route at 5–6 and two flat outlets — the standard third-and-medium call that gives the QB a defined read versus zone and an easy win versus man.",
    micro: "The stick player gets width, plants, and faces the QB at the sticks. The QB counts the second-level defenders to that side: three defenders means the flat is open; two means the stick sits in the grass. Versus man, the stick wins with a flat break.",
    beats: "Zone on third down, soft man coverage.",
    tags: ["third down", "quick game", "possession"],
  },
  {
    id: "screens",
    name: "Screen Family",
    side: "pass",
    family: "Constraint tree",
    macro: "Running-back screens, tunnel screens, and wideout screens turn an overactive pass rush into the play's engine — blockers release, the defense flows, and space is created where pressure came from.",
    micro: "The screen-side linemen sell pressure then release with flat backs and inside hands; the catcher lets the rush clear before flipping hips. Aim point is the outside hip of the lead blocker. Tunnel variants use the split end coming back against the flow.",
    beats: "Speed rush, blitz-happy fronts, and man coverage that turns its back.",
    tags: ["constraint", "O-line in space", "blitz answer"],
  },
  {
    id: "inside-zone",
    name: "Inside Zone",
    side: "run",
    family: "Zone tree",
    macro: "The back aims inside the tackle, the line blocks the play-side first down-lineman with covered/uncovered rules, and the back makes one cut off the double team — a concept that scales from short yardage to the whole game plan.",
    micro: "Covered linemen take the man over them; uncovered linemen help to the play side then come off to the backer. The back presses the mesh point, reads the first double from the hip of the point, and cuts once — downhill, no dancing.",
    beats: "Light boxes, defenses that cannot defend the cutback.",
    tags: ["one-cut", "double teams", "downhill"],
  },
  {
    id: "wide-zone",
    name: "Wide Zone (Outside Zone)",
    side: "run",
    family: "Zone tree",
    macro: "Everyone takes a play-side zone step and reaches the outside shade; the back presses the tight end's block and either turns the corner or cuts back all the way to the backside A gap — the engine of the Shanahan–McVay lineage.",
    micro: "Reach everything: linemen win the outside half of the defender or the play dies. The back must give the cutback a real look — press horizontally, eyes on the second-level flow, then commit with one violent cut. Receivers cut off the safety's pursuit.",
    beats: "Pursuit defenses that over-commit; light edges.",
    tags: ["reach blocking", "cutback", "wide-zone tree"],
  },
  {
    id: "duo",
    name: "Duo",
    side: "run",
    family: "Gap tree",
    macro: "Two double teams displace the first level while the back reads the flow to the second-level backer — the downhill marriage of gap power and zone-read principles without a puller.",
    micro: "The first double takes the covered play-side lineman; the second works to the nearest backer. The back aims between the center and play-side guard, reads the linebackers' flow from the mesh, and gets vertical in one step. No cut for loss — trust the track.",
    beats: "Two-high boxes that cannot add a run defender.",
    tags: ["double teams", "downhill", "no puller"],
  },
  {
    id: "power",
    name: "Power",
    side: "run",
    family: "Gap tree",
    macro: "The backside guard pulls and kicks out the edge while the play-side double washes down — football's oldest power concept, now the short-yardage soul of the push-it offenses.",
    micro: "The puller takes a tight path, logs or kicks the first wrong-colored shirt, and the back follows his inside hip. The tight end downs the end man. The back presses the double's hip then bounces to the puller's block — one move, all downhill.",
    beats: "Undersized edges and man-over fronts.",
    tags: ["puller", "short yardage", "gap scheme"],
  },
  {
    id: "counter",
    name: "Counter",
    side: "run",
    family: "Gap tree",
    macro: "Counter action sells the primary run, then two pullers lead back against the flow — the constraint that punishes defenses for reacting to the base scheme.",
    micro: "The running back's counter step must sell the original track; the guard and tackle (or H-back) pull around the flow with the guard on the first down defender and the second puller leading through the hole. Patience at the mesh point is the whole play.",
    beats: "Pursuit and backside pursuit-hungry fronts.",
    tags: ["counter step", "two pullers", "constraint"],
  },
  {
    id: "pin-pull",
    name: "Pin & Pull",
    side: "run",
    family: "Gap tree",
    macro: "Zone-style flow where uncovered linemen pull instead of climbing — the concept that lets a zone team create gap-scheme angles without changing its teaching tree.",
    micro: "The uncovered play-side linemen pull and lead; the covered blockers pin their man inside. The read is the edge defender: if he widens, the pullers kick him; if he crashes, the ball bends inside the pin. Linebackers cannot outrun the pull angles.",
    beats: "Edges that set too fast or crash hard.",
    tags: ["hybrid", "pull angles", "zone flow"],
  },
  {
    id: "split-zone",
    name: "Split Zone",
    side: "run",
    family: "Zone tree",
    macro: "Inside zone with the backside tight end slicing across to cut the backside edge — the adjustment that fixes over-pursuit without abandoning the zone scheme.",
    micro: "The slice must be on the move at the snap, cutting the first defender past the backside tackle. The back's read flips: with the backside sealed, the cutback lane becomes the front-side B gap. The slice also carries play-action fakes that sell the split flow.",
    beats: "Backside pursuit and slanting fronts.",
    tags: ["slice", "seal", "pursuit answer"],
  },
  {
    id: "wham",
    name: "Wham / Trap",
    side: "run",
    family: "Gap tree",
    macro: "A tight end, H-back, or even receiver traps the unblocked interior penetrator the line deliberately leaves alone — power angles from unexpected personnel.",
    micro: "The trapped defender is left uncovered and never sees the insert blocker coming from across the formation. The line blocks away, the trapper hinges inside-out on the trap man's downhill shoulder, and the back follows the new wall. Timing is violent and immediate.",
    beats: "Penetrating three-techniques and stunting fronts.",
    tags: ["insert blocker", "trap", "interior angles"],
  },
  {
    id: "jet-motion",
    name: "Jet Sweep & Motion",
    side: "run",
    family: "Constraint tree",
    macro: "Full-speed motion across the formation forces the defense to declare and adjust pre-snap — handing it the ball to the edge or using the motion as pure constraint for the run behind it.",
    micro: "The motion man must be at top speed crossing the center; the mesh point is a true triple option — give the jet, hand the inside run, or keep on the pull read. Even ungiven motion drags a linebacker and softens the box by a full gap.",
    beats: "Man coverage that travels and edges that hesitate on motion.",
    tags: ["motion", "edge pressure", "constraint"],
  },
  {
    id: "qb-run",
    name: "QB Run Game",
    side: "run",
    family: "Modern option tree",
    macro: "Designed quarterback carries, read options, and RPO pulls turn the extra defender the defense normally uses on the back side into a blocker-nullified spectator — the scheme edge that changed modern football math.",
    micro: "The read is the end man on the line of scrimmage: he crashes the back, pull; he sits, hand. Designed runs use the same gap schemes with the QB as the back — pullers lead, receivers cut the safeties. The math only works while the QB is a real run threat.",
    beats: "Light boxes and defenses that refuse to account for the quarterback.",
    tags: ["read option", "RPO", "QB as runner"],
  },
];

export const SCHEME_FAMILIES: SchemeFamily[] = [
  {
    id: "wide-zone-tree",
    name: "Wide Zone Tree",
    lineage: "Shanahan — McVay — LaFleur lineage",
    thesis: "Run it until the defense proves it can stop the wide zone, then punish every adjustment with play-action deep crossers built off the same backfield action. The run game is the offense's first language; everything else is a translation.",
    runIdentity: "Wide zone with inside-zone and split-zone adjustments; receivers block the third level.",
    passIdentity: "Play-action crossers, boots, and pure dropback timing — mirrored concepts off the same run key.",
    teamSlugs: ["san-francisco-49ers", "los-angeles-rams", "miami-dolphins", "green-bay-packers"],
  },
  {
    id: "west-coast-hybrid",
    name: "West Coast Hybrid",
    lineage: "Reid-lineage motion and timing",
    thesis: "Formation motion and shifting every snap to get the defense to declare, then attacking the declaration with timing throws and married run-pass concepts. The playbook is a language of small, perfect sentences.",
    runIdentity: "Inside zone and duo with heavy motion adjustments; power in short yardage.",
    passIdentity: "Timing-based West Coast concepts — mesh, levels, curl-flat — with motion-created free releases.",
    teamSlugs: ["kansas-city-chiefs"],
  },
  {
    id: "power-rpo",
    name: "Power–RPO",
    lineage: "Gap power married to modern run-pass options",
    thesis: "Gap schemes with pullers, married to RPOs and a running quarterback, so the defense is wrong on the same snap twice — wrong against the puller and wrong against the pull read.",
    runIdentity: "Power, counter, and QB-designed runs behind mauling interior lines.",
    passIdentity: "RPO glance and screen concepts built on the run's blocking, plus play action off the pull flow.",
    teamSlugs: ["philadelphia-eagles", "baltimore-ravens"],
  },
  {
    id: "vertical-shot",
    name: "Vertical Shot Offense",
    lineage: "Air Coryell derivatives",
    thesis: "Stretch the field vertically first and let everything underneath become bigger — the deep pass is not a constraint here, it is the plan, and the box pays for every single-high snap.",
    runIdentity: "Enough inside-zone and duo to hold the safety, with draw games against pass-rush fronts.",
    passIdentity: "Four verticals, mills, and dagger — seam throws on rhythm with elite outside receivers.",
    teamSlugs: ["cincinnati-bengals", "buffalo-bills"],
  },
  {
    id: "spread-improv",
    name: "Spread Improvisation",
    lineage: "Quarterback-driven modern spread",
    thesis: "Four and five wide, empty the box, and let a franchise quarterback turn structured plays into unstructured wins. The scheme's job is to create one clean read; the quarterback's job is everything after.",
    runIdentity: "Zone read and QB carries that punish light boxes; draws when the rush empties out.",
    passIdentity: "Quick-game spacing with extended-play scramble rules — receivers convert to deep routes when the pocket moves.",
    teamSlugs: ["buffalo-bills", "baltimore-ravens", "washington-commanders"],
  },
];

export const TECHNIQUE_PRIMERS: TechniquePrimer[] = [
  {
    id: "route-tree",
    title: "The route tree, by depth",
    unit: "Receivers",
    body: "Slants break at 1–3 steps, comebacks and curls work at 12–14, digs and crosses live at 14–18, and the deep shots (posts, corners, seams) start their breaks past 12. Every stem should look identical to the top of the route — the lie is the separation.",
  },
  {
    id: "zone-footwork",
    title: "Zone blocking footwork",
    unit: "Offensive line",
    body: "Covered linemen take a play-side zone step and win the outside half; uncovered linemen help to the play side then climb off the double. In wide zone, everyone reaches. The back's cut is the line's report card: no cut means the reach failed.",
  },
  {
    id: "qb-progressions",
    title: "Half-field and MOFO/MOFC reads",
    unit: "Quarterback",
    body: "Most modern concepts are half-field: the middle-of-the-field (MOFO vs MOFC) tells the QB which side answers. High-low reads run low-to-high on one defender; progression reads run in sequence. The best quarterbacks throw the concept, not the coverage they hoped for.",
  },
  {
    id: "timing-rhythm",
    title: "Timing: rhythm and the hitch",
    unit: "Quarterback",
    body: "Three-step game comes out on the plant step; five-step adds a hitch to gather. Play action borrows the run's footwork then accelerates into the same rhythm. An RPO glance is a half-second read that must happen before the second step hits the ground.",
  },
  {
    id: "man-beaters",
    title: "Winning versus man",
    unit: "Receivers",
    body: "Stack releases deny the jam, rubs and meshes create wash at the legal line, and route trumps speed: the flat plant-and-drive break beats a faster defender every time. Against press, the first three steps are the route.",
  },
  {
    id: "leverage",
    title: "Reading leverage",
    unit: "Team",
    body: "Outside leverage invites in-breaking routes; inside leverage invites outs; off coverage invites the quick game. The offense's pre-snap read is not a guess — it is arithmetic on where the defenders' hips point.",
  },
];

/** Weekly spotlight slots. Week 1 publishes after the week completes. */
export const WEEKLY_SPOTLIGHTS: WeeklySpotlight[] = [
  {
    week: 1,
    order: 1,
    title: "The Week 1 Film Room",
    videoUrl: null,
    playmaker: null,
    teamSlug: null,
    conceptId: null,
    description: null,
    publishedAt: null,
  },
];

export const SPOTLIGHT_FORMAT = {
  cadence: "Weekly, publishing the Tuesday after each game week",
  countPerWeek: 5,
  countNote: "Five breakdowns is the sweet spot: enough to cover the week's defining plays, tight enough that every cut-up earns its place.",
  sourcing: "Cut from officially licensed NFL highlight footage. We link out to the licensed source and annotate over it — we never re-host league video.",
  focus: "Each breakdown pairs one big play with one concept from the library and the playmaker who executed it — the tape is the textbook.",
} as const;

/* ---------------------------------------------------------------- lookups */

export function conceptsBySide(side: ConceptSide): OffensiveConcept[] {
  return CONCEPT_LIBRARY.filter((concept) => concept.side === side);
}

export function getConcept(id: string): OffensiveConcept | undefined {
  return CONCEPT_LIBRARY.find((concept) => concept.id === id);
}

export function familiesForTeam(slug: string): SchemeFamily[] {
  return SCHEME_FAMILIES.filter((family) => family.teamSlugs.includes(slug));
}

export function spotlightsForWeek(week: number): WeeklySpotlight[] {
  return WEEKLY_SPOTLIGHTS.filter((spotlight) => spotlight.week === week);
}

export function publishedSpotlights(): WeeklySpotlight[] {
  return WEEKLY_SPOTLIGHTS.filter((spotlight) => spotlight.videoUrl !== null);
}
