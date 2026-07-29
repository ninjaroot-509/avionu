import { useMemo, useRef, useState } from "react";
import { useGameStore } from "@/src/store/gameStore";
import { formatMoney, formatMultiplier } from "@/src/utils/format";

type SidebarTab = "all" | "mine" | "top";

export const PlayerSidebar = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const listRef = useRef<HTMLDivElement>(null);
  const publicBets = useGameStore((state) => state.publicBets);
  const bets = useGameStore((state) => state.bets);
  const round = useGameStore((state) => state.currentRound);
  const currency = useGameStore((state) => state.currency);

  const myEntries = useMemo(
    () =>
      bets
        .filter((bet) => bet.serverBetUuid)
        .map((bet) => ({
          bet_uuid: bet.serverBetUuid as string,
          player: bet.name,
          is_bot: false,
          amount: bet.betAmount,
          currency,
          status:
            bet.status === "cashed_out"
              ? "CASHED_OUT"
              : bet.status === "lost"
                ? "LOST"
                : "ACTIVE",
          cashout_multiplier: bet.cashOutMultiplier
            ? String(bet.cashOutMultiplier)
            : null,
          payout: bet.winAmount ?? "0.00",
        })),
    [bets, currency],
  );

  const displayedEntries = useMemo(() => {
    const entries = activeTab === "mine" ? myEntries : publicBets;
    if (activeTab === "top") {
      return [...publicBets]
        .filter((entry) => entry.status === "CASHED_OUT")
        .sort((a, b) => Number(b.payout) - Number(a.payout));
    }
    return entries;
  }, [activeTab, myEntries, publicBets]);

  const cashedCount = publicBets.filter(
    (entry) => entry.status === "CASHED_OUT",
  ).length;
  const totalPlayers =
    (round?.player_count ?? 0) + (round?.bot_count ?? 0);

  return (
    <aside className="player-sidebar">
      <div className="sidebar-tabs" role="tablist" aria-label="Liste des paris">
        {[
          ["all", "Tous les paris"],
          ["mine", "Mes paris"],
          ["top", "Meilleurs gains"],
        ].map(([tab, label]) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            key={tab}
            onClick={() => setActiveTab(tab as SidebarTab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sidebar-total">
        Joueurs officiels: <span>{totalPlayers}</span>
      </div>

      <div className="sidebar-table-header">
        <span className="sh-name">Joueur</span>
        <span className="sh-pari">Mise {currency}</span>
        <span className="sh-cote">×</span>
        <span className="sh-gain">Gain {currency}</span>
      </div>

      <div className="sidebar-list" ref={listRef}>
        {displayedEntries.length === 0 && (
          <div className="sidebar-empty">
            Aucune mise officielle pour cette manche.
          </div>
        )}
        {displayedEntries.map((entry) => (
          <div
            className={`sidebar-row is-${entry.status.toLowerCase()}`}
            key={entry.bet_uuid}
          >
            <span className="sb-name">
              <span className="sb-avatar" aria-hidden="true" />
              <span>{entry.player}</span>
            </span>
            <span className="sb-pari">
              {formatMoney(entry.amount, entry.currency)}
            </span>
            <span className="sb-cote">
              {entry.cashout_multiplier
                ? formatMultiplier(Number(entry.cashout_multiplier))
                : "—"}
            </span>
            <span
              className={`sb-gain ${
                entry.status === "LOST"
                  ? "is-lost"
                  : entry.status === "CASHED_OUT"
                    ? "is-win"
                    : ""
              }`}
            >
              {entry.status === "LOST"
                ? formatMoney("0", entry.currency)
                : entry.status === "CASHED_OUT"
                  ? formatMoney(entry.payout, entry.currency)
                  : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="sidebar-summary">
        <div>
          <span className="summary-faces" aria-hidden="true">🙂 😎 😍</span>
          <strong>{cashedCount} cashouts acceptés</strong>
        </div>
        <div>
          <strong>{formatMoney(round?.total_paid ?? "0", currency)}</strong>
          <span>Total payé officiel</span>
        </div>
        <span className="summary-progress">
          <i
            style={{
              width: `${totalPlayers > 0 ? Math.min(100, (cashedCount / totalPlayers) * 100) : 0}%`,
            }}
          />
        </span>
      </div>

      <div className="sidebar-footer">
        <span>🛡️ Jeu Provably Fair</span>
        <span>
          Manche <strong>#{round?.round_number ?? "—"}</strong>
        </span>
      </div>
    </aside>
  );
};
