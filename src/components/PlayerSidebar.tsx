import { useMemo, useRef, useState } from "react";
import { useGameStore } from "@/src/store/gameStore";
import {
  formatMoney,
  formatMultiplier,
  sumMoney,
} from "@/src/utils/format";

type SidebarTab = "all" | "mine" | "top";

const AVATAR_COUNT = 15;

const hashAvatarKey = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

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

  const avatarAssignments = useMemo(() => {
    const assignments = new Map<string, number>();

    displayedEntries.forEach((entry) => {
      const avatar =
        hashAvatarKey(
          `${entry.is_bot ? "bot" : "player"}:${entry.bet_uuid}`,
        ) % AVATAR_COUNT;
      assignments.set(entry.bet_uuid, avatar);
    });

    return assignments;
  }, [displayedEntries]);

  const cashedCount = publicBets.filter(
    (entry) => entry.status === "CASHED_OUT",
  ).length;
  const cashoutTotal = useMemo(
    () =>
      sumMoney(
        publicBets
          .filter((entry) => entry.status === "CASHED_OUT")
          .map((entry) => entry.payout),
      ),
    [publicBets],
  );
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
        Participants: <span>{totalPlayers}</span>
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
        {displayedEntries.map((entry) => {
          const avatar = avatarAssignments.get(entry.bet_uuid) ?? 0;
          const avatarColumn = avatar % 5;
          const avatarRow = Math.floor(avatar / 5);

          return (
            <div
              className={`sidebar-row is-${entry.status.toLowerCase()}`}
              key={entry.bet_uuid}
            >
              <span className="sb-name">
                <span
                  className="sb-avatar"
                  aria-hidden="true"
                  style={{
                    backgroundPosition:
                      `${avatarColumn * 25}% ${avatarRow * 50}%`,
                  }}
                />
                <span>{entry.player}</span>
              </span>
              <span className="sb-pari">
                {formatMoney(
                  entry.amount,
                  entry.currency,
                  Number(entry.amount) % 1 === 0 ? 0 : 2,
                )}
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
          );
        })}
      </div>

      <div className="sidebar-summary">
        <div>
          <span className="summary-faces" aria-hidden="true">🙂 😎 😍</span>
          <strong>{cashedCount} cashouts acceptés</strong>
        </div>
        <div>
          <strong>{formatMoney(cashoutTotal, currency)}</strong>
          <span>Total des cashouts</span>
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
