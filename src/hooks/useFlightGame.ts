"use client";

import { useCallback, useEffect } from "react";
import { mockFlightSocket } from "@/src/services/mockFlightSocket";
import { useGameStore } from "@/src/store/gameStore";
import type { BetId } from "@/src/types/game";
import { playArcadeTone } from "@/src/utils/sound";

export const useFlightGame = () => {
  useEffect(() => {
    const store = useGameStore.getState;
    const unsubscribers = [
      mockFlightSocket.on("connection_status", ({ status }) => {
        store().setConnection(status);
        if (status === "connected") {
          store().pushNotification({
            tone: "success",
            title: "Connecte",
            message: "Bienvenue!",
          });
        }
      }),
      mockFlightSocket.on("round_created", ({ roundId }) => {
        store().setRoundCreated(roundId);
      }),
      mockFlightSocket.on("round_countdown", ({ remaining }) => {
        store().setCountdown(remaining);
        if (remaining > 0) playArcadeTone(store().soundEnabled, 360, 0.045);
      }),
      mockFlightSocket.on("round_started", ({ roundId }) => {
        store().setRoundStarted(roundId);
        playArcadeTone(store().soundEnabled, 740, 0.11);
      }),
      mockFlightSocket.on("multiplier_update", ({ multiplier, elapsed }) => {
        const state = store();
        state.setMultiplier(multiplier, elapsed);

        state.bets.forEach((bet) => {
          if (
            bet.status === "placed" &&
            bet.autoCashOut &&
            multiplier >= bet.autoCashOutTarget
          ) {
            mockFlightSocket.cashOut(bet.id, bet.betAmount);
          }
        });
      }),
      mockFlightSocket.on("bet_placed", ({ betId, amount }) => {
        store().pushNotification({
          tone: "info",
          title: `Pari 0${betId}`,
          message: `${amount.toLocaleString("fr-FR")} G`,
        });
        playArcadeTone(store().soundEnabled, 520, 0.06);
      }),
      mockFlightSocket.on(
        "bet_cashed_out",
        ({ betId, multiplier, winAmount }) => {
          store().cashOutBet(betId, winAmount, multiplier);
          store().pushNotification({
            tone: "success",
            title: `Cashout!`,
            message: `${multiplier.toFixed(2)}x = ${winAmount.toLocaleString("fr-FR")} G`,
          });
          playArcadeTone(store().soundEnabled, 880, 0.14);
        },
      ),
      mockFlightSocket.on("round_crashed", ({ crashMultiplier }) => {
        const state = store();
        state.setCrashed(crashMultiplier);
        state.pushNotification({
          tone: "warning",
          title: "CRASH!",
          message: `${crashMultiplier.toFixed(2)}x`,
        });
        playArcadeTone(store().soundEnabled, 220, 0.18);
      }),
      mockFlightSocket.on("round_finished", () => {
        store().setRoundFinished();
      }),
      mockFlightSocket.on("history_update", ({ entries }) => {
        store().setHistory(entries);
      }),
    ];

    mockFlightSocket.start();
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      mockFlightSocket.stop();
    };
  }, []);

  const placeBetAction = useCallback((betId: BetId) => {
    const state = useGameStore.getState();
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return;

    if (state.roundState === "flying" && bet.status === "waiting") {
      if (state.balance < bet.betAmount) {
        state.pushNotification({
          tone: "warning",
          title: "Solde insuffisant",
          message: `Il vous faut ${bet.betAmount.toLocaleString("fr-FR")} G`,
        });
        return;
      }
      state.placeBet(betId);
      mockFlightSocket.placeBet(betId, bet.betAmount);
      return;
    }

    if (state.roundState === "waiting" || state.roundState === "countdown") {
      if (state.balance < bet.betAmount) {
        state.pushNotification({
          tone: "warning",
          title: "Solde insuffisant",
          message: `Il vous faut ${bet.betAmount.toLocaleString("fr-FR")} G`,
        });
        return;
      }
      state.placeBet(betId);
      mockFlightSocket.placeBet(betId, bet.betAmount);
    }
  }, []);

  const cancelBetAction = useCallback((betId: BetId) => {
    const state = useGameStore.getState();
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet || bet.status !== "placed") return;
    if (state.roundState === "flying") return;
    state.cancelBet(betId);
    state.pushNotification({
      tone: "info",
      title: `Pari ${String(betId).padStart(2, "0")} annulé`,
      message: `${bet.betAmount.toLocaleString("fr-FR")} G remboursés`,
    });
  }, []);

  const cashOutBetAction = useCallback((betId: BetId) => {
    const state = useGameStore.getState();
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet || bet.status !== "placed") return;
    mockFlightSocket.cashOut(betId, bet.betAmount);
  }, []);

  const reconnect = useCallback(() => {
    mockFlightSocket.reconnect();
  }, []);

  return {
    placeBetAction,
    cancelBetAction,
    cashOutBetAction,
    reconnect,
  };
};
