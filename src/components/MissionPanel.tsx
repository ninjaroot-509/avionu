"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/src/store/gameStore";
import type { Bet, BetId } from "@/src/types/game";
import { formatGourdes, formatMultiplier } from "@/src/utils/format";

interface BetPanelProps {
  bet: Bet;
  onPlaceBet: (betId: BetId) => void;
  onCancelBet: (betId: BetId) => void;
  onCashOut: (betId: BetId) => void;
}

const STATUS_LABELS: Record<Bet["status"], string> = {
  waiting: "EN ATTENTE",
  placed: "MISE PLACÉE",
  cashed_out: "CASHOUT!",
  lost: "PERDU",
};

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <button
    className={`toggle-control ${checked ? "is-active" : ""}`}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle-track">
      <span className="toggle-thumb" />
    </span>
    <span>{label}</span>
  </button>
);

export const BetPanel = ({
  bet,
  onPlaceBet,
  onCancelBet,
  onCashOut,
}: BetPanelProps) => {
  const updateBet = useGameStore((state) => state.updateBet);
  const roundState = useGameStore((state) => state.roundState);
  const multiplier = useGameStore((state) => state.multiplier);
  const balance = useGameStore((state) => state.balance);

  const isFlying = roundState === "flying";
  const isWaiting = roundState === "waiting" || roundState === "countdown";
  const canBet = (isWaiting || (isFlying && bet.status === "waiting")) && bet.status !== "placed";
  const canCancel = isWaiting && bet.status === "placed";
  const canCashOut = isFlying && bet.status === "placed";
  const isLocked = bet.status === "cashed_out" || bet.status === "lost";

  const potentialWin = Math.round(bet.betAmount * multiplier);
  const canAfford = balance >= bet.betAmount;

  const handlePrimaryAction = () => {
    if (canCashOut) onCashOut(bet.id);
    else if (canCancel) onCancelBet(bet.id);
    else if (canBet) onPlaceBet(bet.id);
  };

  const buttonLabel = (() => {
    if (bet.status === "cashed_out")
      return `GAGNE ${formatGourdes(bet.winAmount ?? 0)}`;
    if (bet.status === "lost") return "PERDU";
    if (canCashOut) return `CASHOUT`;
    if (canCancel) return "ANNULER LE PARI";
    return `JOUER ${formatGourdes(bet.betAmount)}`;
  })();

  const buttonSubtext = (() => {
    if (bet.status === "cashed_out")
      return `${formatMultiplier(bet.cashOutMultiplier ?? 1)} = ${formatGourdes(bet.winAmount ?? 0)}`;
    if (bet.status === "lost") return "Le crash est arrive avant le cashout";
    if (canCashOut)
      return `${formatMultiplier(multiplier)} = ${formatGourdes(potentialWin)} — clique vite!`;
    if (canCancel) return "Annuler et recuperer tes G";
    if (isFlying && bet.status === "waiting") return "En attente du prochain tour";
    return `${formatGourdes(bet.betAmount)} sur ce tour`;
  })();

  return (
    <article className={`mission-panel bet-panel mission-${bet.id}`}>
      <div className="mission-head">
        <div>
          <span className="mission-index">0{bet.id}</span>
          <div>
            <h3>{bet.name}</h3>
            <small>Slot de pari</small>
          </div>
        </div>
        <span className={`mission-status is-${bet.status}`}>
          <i />
          {STATUS_LABELS[bet.status]}
        </span>
      </div>

      <motion.button
        className={`mission-primary ${
          canCashOut ? "is-cashout" : ""
        } ${bet.status === "cashed_out" ? "is-win" : ""} ${
          bet.status === "lost" ? "is-lost" : ""
        } ${canCancel ? "is-cancel" : ""}`}
        type="button"
        onClick={handlePrimaryAction}
        disabled={!canBet && !canCashOut && !canCancel}
        whileTap={(!canBet && !canCashOut && !canCancel) ? undefined : { scale: 0.985 }}
      >
        <span className="primary-icon" aria-hidden="true">
          {canCashOut ? "$" : bet.status === "cashed_out" ? "+" : bet.status === "lost" ? "x" : canCancel ? "-" : "P"}
        </span>
        <span>
          <strong>{buttonLabel}</strong>
          <small>{buttonSubtext}</small>
        </span>
      </motion.button>

      <div className="mission-content">
        <div className="energy-zone">
          <div className="field-label">
            <span>MISE EN GOURDES</span>
            <small>{canAfford ? "OK" : "Trop cher"}</small>
          </div>

          <div className="energy-stepper">
            <button
              type="button"
              onClick={() => updateBet(bet.id, { betAmount: bet.betAmount - 50 })}
              disabled={!canBet}
            >
              &minus;
            </button>
            <label>
              <input
                type="number"
                min="10"
                max="999999"
                step="50"
                value={bet.betAmount}
                disabled={!canBet}
                onChange={(event) =>
                  updateBet(bet.id, {
                    betAmount: Number(event.target.value),
                  })
                }
              />
              <span>G</span>
            </label>
            <button
              type="button"
              onClick={() => updateBet(bet.id, { betAmount: bet.betAmount + 50 })}
              disabled={!canBet}
            >
              +
            </button>
          </div>

          <div className="quick-values">
            {[100, 250, 500, 1000, 5000].map((value) => (
              <button
                className={bet.betAmount === value ? "is-active" : ""}
                type="button"
                key={value}
                disabled={!canBet}
                onClick={() => updateBet(bet.id, { betAmount: value })}
              >
                {value.toLocaleString("fr-FR")} G
              </button>
            ))}
          </div>
        </div>

        <div className="automation-zone">
          <Toggle
            label="Cashout auto"
            checked={bet.autoCashOut}
            onChange={(autoCashOut) =>
              updateBet(bet.id, { autoCashOut })
            }
          />

          <label className="coefficient-field">
            <span>TARGET</span>
            <span className="coefficient-input">
              <input
                type="number"
                min="1.1"
                max="100"
                step="0.1"
                value={bet.autoCashOutTarget}
                onChange={(event) =>
                  updateBet(bet.id, {
                    autoCashOutTarget: Number(event.target.value),
                  })
                }
                disabled={!bet.autoCashOut || !canBet}
              />
              <i>x</i>
            </span>
          </label>

          {isFlying && bet.status === "placed" && (
            <div className="bet-status-display">
              <span className="bet-label">GAIN POTENTIEL</span>
              <span className="bet-potential">
                {formatMultiplier(multiplier)} = {formatGourdes(potentialWin)}
              </span>
            </div>
          )}

          {isLocked && bet.status === "cashed_out" && (
            <div className="bet-status-display is-win">
              <span className="bet-label">CASHOUT A</span>
              <span className="bet-potential">
                {formatMultiplier(bet.cashOutMultiplier ?? 1)} = {formatGourdes(bet.winAmount ?? 0)}
              </span>
            </div>
          )}

          {isLocked && bet.status === "lost" && (
            <div className="bet-status-display is-lost">
              <span className="bet-label">PERDU</span>
              <span className="bet-potential lost-amount">
                -{formatGourdes(bet.betAmount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
