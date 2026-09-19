/**
 * Fantasy Desk — the four weekly decision rails (research prompts 11-14).
 *
 * Start/Sit tiers and Trade values publish on their cadences; Waiver and
 * Rookie render their honest "not published" shells until their Tuesday
 * slots land. Decision boards carry no projections — that contract is
 * enforced upstream by the ingest validators and the domain tests.
 */

import { DataBoardHero, DataBoardSummary, DataBoardEmpty, formatDataDate } from "./data-board-primitives";
import type { BroadcastTeam } from "@/lib/homepage";
import {
  fantasyDesk,
  TIER_LABELS,
  TIER_ORDER,
  DESK_CADENCE,
  type StartSitBoard,
  type TradeBoard,
  type SitTier,
  type Market,
} from "@/lib/fantasy-desk";

const MARKET_LABEL: Record<Market, string> = { buy_low: "Buy low", sell_high: "Sell high", fair: "Fair" };

function ConfidencePill({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={`db-confidence db-confidence--${value}`}>{value} confidence</span>;
}

function MarketPill({ value }: { value: Market }) {
  return <span className={`db-status db-status--${value === "fair" ? "available" : "committed"}`}>{MARKET_LABEL[value]}</span>;
}

function StartSitSection({ board }: { board: StartSitBoard }) {
  return (
    <section className="db-section" aria-label="Start/Sit tier board">
      <div className="db-section-heading">
        <h2 className="font-display">Start/Sit Tier Board — Week {board.week}</h2>
        <p>
          Tiers, not rankings: within a tier the call is a coin flip. Decisions only — projections stay on the{" "}
          <a className="db-hero-link" href="/dfs">DFS ledger</a>. As of {formatDataDate(board.as_of)}.
        </p>
      </div>
      {board.positions.map((group) => (
        <div key={group.position} className="db-team-ledger-summary">
          <h3 className="font-display">{group.position}</h3>
          <div className="db-ledger-grid">
            {TIER_ORDER.filter((tier) => group.tiers.some((t) => t.tier === tier)).map((tier) => {
              const group_ = group.tiers.find((t) => t.tier === tier as SitTier);
              return (
                <div key={tier} className="db-mover-card">
                  <div className="db-section-heading">
                    <h4>{TIER_LABELS[tier as SitTier]}</h4>
                  </div>
                  <ul className="db-note-row">
                    {group_?.players.map((row) => (
                      <li key={`${group.position}-${row.player}`}>
                        <span className="db-primary-cell">
                          <span className="db-player-link">{row.player}</span>
                          <small className="db-team-link">{row.team_slug}</small>
                        </span>
                        <span className="db-expandable-note">{row.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {board.tough_calls?.length ? (
        <div className="db-section-heading">
          <h3 className="font-display">Tough calls</h3>
          <div className="db-ledger-grid">
            {board.tough_calls.map((tc) => (
              <div key={tc.player} className="db-mover-card">
                <span className="db-primary-cell">
                  <span className="db-player-link">{tc.player}</span>
                  <small className="db-team-link">{tc.team_slug}</small>
                </span>
                <p className="db-expandable-note">{tc.verdict}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TradeSection({ board }: { board: TradeBoard }) {
  return (
    <section className="db-section" aria-label="Trade value big board">
      <div className="db-section-heading">
        <h2 className="font-display">Trade Value Big Board — Week {board.week}</h2>
        <p>
          Rest-of-season values, redraft half-PPR context. Tiers are internally consistent (a tier-2 back never ranks
          below a tier-3 back); market tags name the week&apos;s exploit. As of {formatDataDate(board.as_of)}.
        </p>
      </div>
      {board.boards.map((group) => (
        <div key={group.position} className="db-table-wrap">
          <h3 className="font-display">{group.position}</h3>
          <table className="db-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Tier</th>
                <th>Basis</th>
                <th>Market</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={`${group.position}-${row.player}`}>
                  <td>
                    <span className="db-primary-cell">
                      <span className="db-player-link">{row.player}</span>
                      <small className="db-team-link">{row.team_slug}</small>
                    </span>
                  </td>
                  <td className="font-display">{row.tier}</td>
                  <td>{row.basis}</td>
                  <td>
                    <MarketPill value={row.market} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {board.swing_trades?.length ? (
        <div className="db-section-heading">
          <h3 className="font-display">Swing trades this week</h3>
          <div className="db-ledger-grid">
            {board.swing_trades.map((sw) => (
              <div key={`${sw.give}-${sw.get}`} className="db-mover-card">
                <p className="db-primary-cell">
                  <strong>Give</strong> {sw.give} · <strong>Get</strong> {sw.get}
                </p>
                <p className="db-expandable-note">{sw.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function FantasyDeskPage({ teams }: { teams: BroadcastTeam[] }) {
  const desk = fantasyDesk;
  const published = [desk.waiver, desk.startSit, desk.rookie, desk.trade].filter(Boolean).length;
  return (
    <div className="db-page">
      <DataBoardHero
        eyebrow="FANTASY DESK"
        title="Weekly decision rails — waiver, start/sit, rookies, trades"
        description="Four sourced boards on the fantasy calendar: waiver adds after MNF, start/sit tiers by Thursday, rookie usage Tuesdays, and rest-of-season trade values. Every claim of fact carries its source; tiers are decisions, never projections."
      />
      <DataBoardSummary
        label="Fantasy desk status"
        items={[
          { label: "Boards live", value: `${published} / 4`, emphasis: true },
          { label: "Start/Sit", value: desk.startSit ? `Week ${desk.startSit.week}` : "—" },
          { label: "Trade values", value: desk.trade ? `Week ${desk.trade.week}` : "—" },
          { label: "Waiver watch", value: desk.waiver ? `for Week ${desk.waiver.week_adding_for}` : "—" },
          { label: "Rookie usage", value: desk.rookie ? `Week ${desk.rookie.week}` : "—" },
        ]}
        caption={`Sourcing rules per board: null means not published, two-source preference on every claim of fact, no estimated numbers. ${teams.length} teams tracked.`}
      />

      {desk.startSit ? <StartSitSection board={desk.startSit} /> : (
        <DataBoardEmpty title="Start/Sit tiers not published yet" description={DESK_CADENCE.find((c) => c.key === "startSit")?.slot ?? ""} />
      )}
      {desk.trade ? <TradeSection board={desk.trade} /> : (
        <DataBoardEmpty title="Trade values not published yet" description={DESK_CADENCE.find((c) => c.key === "trade")?.slot ?? ""} />
      )}
      {!desk.waiver ? (
        <DataBoardEmpty title="Waiver Wire Watch opens Tuesday" description="The waiver edition covers the FOLLOWING week's adds — it compiles after Monday night football so every usage claim is grounded in completed games. First edition: Week 3." />
      ) : null}
      {!desk.rookie ? (
        <DataBoardEmpty title="Rookie Usage Report opens Tuesday" description="Snap shares and usage trends compile after the week completes — usage only, no projections." />
      ) : null}
    </div>
  );
}
