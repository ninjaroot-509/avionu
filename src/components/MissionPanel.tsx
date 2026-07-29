import { motion } from "framer-motion";
import { useGameStore } from "@/src/store/gameStore";
import type { Bet, BetId } from "@/src/types/game";
import { formatMoney, formatMultiplier } from "@/src/utils/format";

interface BetPanelProps {
  bet: Bet;
  onPlaceBet: (betId: BetId) => void;
  onCancelBet: (betId: BetId) => void;
  onCashOut: (betId: BetId) => void;
}

const STATUS_LABELS: Record<Bet["status"], string> = {
  waiting: "EN ATTENTE",
  pending: "VALIDATION",
  placed: "MISE PLACÉE",
  cashed_out: "CASHOUT!",
  lost: "PERDU",
  cancelled: "ANNULÉ",
  refunded: "REMBOURSÉ",
  rejected: "REFUSÉ",
};

const Toggle = ({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled: boolean;
}) => (
  <button
    className={`toggle-control ${checked ? "is-active" : ""}`}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
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
  const roundStatus = useGameStore(
    (state) => state.currentRound?.status,
  );
  const multiplier = useGameStore((state) => state.multiplier);
  const config = useGameStore((state) => state.config);
  const currency = useGameStore((state) => state.currency);

  const bettingOpen = roundStatus === "BETTING_OPEN";
  const isFlying = roundStatus === "RUNNING";
  const canBet = bettingOpen && bet.status === "waiting";
  const canCancel = bettingOpen && bet.status === "placed";
  const canCashOut = isFlying && bet.status === "placed";
  const canEdit = canBet;
  const statusLabel =
    bet.status === "waiting"
      ? canBet
        ? "PRÊT"
        : "MISES FERMÉES"
      : STATUS_LABELS[bet.status];
  const minimum = Number(config.min_bet);
  const maximum = Number(config.max_bet);
  const amountStep = Math.max(
    0.01,
    Number(((maximum - minimum) / 20).toFixed(2)),
  );
  const quickValues = [25, 50, 250, 1000, 5000].filter(
    (value) => value >= minimum && value <= maximum,
  );

  const handlePrimaryAction = () => {
    if (canCashOut) onCashOut(bet.id);
    else if (canCancel) onCancelBet(bet.id);
    else if (canBet) onPlaceBet(bet.id);
  };

  const buttonLabel = (() => {
    if (bet.status === "cashed_out")
      return `GAGNÉ ${formatMoney(bet.winAmount ?? "0", currency)}`;
    if (bet.status === "lost") return "PERDU";
    if (bet.status === "pending") return "VALIDATION SERVEUR";
    if (bet.status === "refunded") return "REMBOURSÉ";
    if (bet.status === "cancelled") return "ANNULÉ";
    if (canCashOut) return "CASHOUT";
    if (canCancel) return "ANNULER LE PARI";
    if (canBet) return "PLACER LE PARI";
    return "MISES FERMÉES";
  })();

  const buttonSubtext = (() => {
    if (bet.status === "cashed_out")
      return `${formatMultiplier(bet.cashOutMultiplier ?? 1)} · ${bet.ticketRef ?? ""}`;
    if (bet.status === "lost")
      return "Le crash officiel est arrivé avant le cashout";
    if (bet.status === "pending")
      return "Le backend vérifie le wallet et les limites";
    if (canCashOut)
      return `Multiplicateur serveur ${formatMultiplier(multiplier)}`;
    if (canCancel) return "Remboursement traité par le wallet officiel";
    if (!bettingOpen) return "En attente de l'ouverture des mises";
    return `${formatMoney(bet.betAmount, currency)} sur cette manche`;
  })();

  const panelStatus = (() => {
    if (isFlying && bet.status === "placed") {
      return {
        className: "",
        label: "MULTIPLICATEUR SERVEUR",
        value: formatMultiplier(multiplier),
      };
    }
    if (bet.status === "cashed_out") {
      return {
        className: "is-win",
        label: "CASHOUT ACCEPTÉ",
        value: `${formatMultiplier(bet.cashOutMultiplier ?? 1)} · ${formatMoney(bet.winAmount ?? "0", currency)}`,
      };
    }
    if (bet.status === "lost") {
      return {
        className: "is-lost",
        label: "PERDU",
        value: formatMoney(bet.betAmount, currency),
      };
    }
    return null;
  })();

  return (
    <article
      className={`mission-panel bet-panel mission-${bet.id} ${
        canEdit ? "is-editable" : "is-locked"
      }`}
    >
      <div className="mission-titlebar">
        <span>{bet.name}</span>
        <span
          className={`mission-status is-${bet.status} ${
            canBet ? "is-ready" : ""
          }`}
        >
          <i />
          {statusLabel}
        </span>
      </div>

      <div className="mission-content">
        <div className="energy-zone">
          <div className="energy-stepper">
            <button
              type="button"
              onClick={() =>
                updateBet(bet.id, {
                  betAmount: String(Number(bet.betAmount) - amountStep),
                })
              }
              disabled={!canEdit}
            >
              &minus;
            </button>
            <label>
              <input
                type="number"
                min={config.min_bet}
                max={config.max_bet}
                step={amountStep}
                value={bet.betAmount}
                disabled={!canEdit}
                onChange={(event) =>
                  updateBet(bet.id, {
                    betAmount: event.target.value,
                  })
                }
              />
              <span>{currency}</span>
            </label>
            <button
              type="button"
              onClick={() =>
                updateBet(bet.id, {
                  betAmount: String(Number(bet.betAmount) + amountStep),
                })
              }
              disabled={!canEdit}
            >
              +
            </button>
          </div>

          <div className="quick-values">
            {quickValues.map((value) => (
              <button
                className={
                  Number(bet.betAmount) === value ? "is-active" : ""
                }
                type="button"
                key={value}
                disabled={!canEdit}
                onClick={() =>
                  updateBet(bet.id, { betAmount: String(value) })
                }
              >
                {new Intl.NumberFormat("fr-FR", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value)}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`automation-zone ${
            bet.autoCashOut ? "is-auto-active" : ""
          }`}
        >
          <Toggle
            label="Retrait auto serveur"
            checked={bet.autoCashOut}
            disabled={!canEdit}
            onChange={(autoCashOut) =>
              updateBet(bet.id, { autoCashOut })
            }
          />

          <label className="coefficient-field">
            <span>TARGET</span>
            <span className="coefficient-input">
              <input
                type="number"
                min="1.01"
                max={config.max_auto_cashout}
                step="0.01"
                value={bet.autoCashOutTarget}
                onChange={(event) =>
                  updateBet(bet.id, {
                    autoCashOutTarget: event.target.value,
                  })
                }
                disabled={!bet.autoCashOut || !canEdit}
              />
              <i>x</i>
            </span>
          </label>

          <div
            className={`bet-status-display ${
              panelStatus?.className ?? "is-placeholder"
            }`}
            aria-hidden={!panelStatus}
          >
            <span className="bet-label">
              {panelStatus?.label ?? "ÉTAT OFFICIEL"}
            </span>
            <span className="bet-potential">
              {panelStatus?.value ?? "—"}
            </span>
          </div>
        </div>

        <motion.button
          className={`mission-primary ${
            canCashOut ? "is-cashout" : ""
          } ${canBet ? "is-place" : ""} ${
            bet.status === "cancelled" ? "is-cancelled" : ""
          } ${bet.status === "cashed_out" ? "is-win" : ""} ${
            bet.status === "lost" ? "is-lost" : ""
          } ${canCancel ? "is-cancel" : ""}`}
          type="button"
          onClick={handlePrimaryAction}
          disabled={!canBet && !canCashOut && !canCancel}
          whileTap={
            !canBet && !canCashOut && !canCancel
              ? undefined
              : { scale: 0.985 }
          }
        >
          <strong>{buttonLabel}</strong>
          <small>{buttonSubtext}</small>
        </motion.button>
      </div>
    </article>
  );
};
