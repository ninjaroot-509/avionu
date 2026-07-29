import { useCallback, useEffect } from "react";
import { flightSocket } from "@/src/services/flightSocket";
import { useGameStore } from "@/src/store/gameStore";
import type { BetId } from "@/src/types/game";
import { playArcadeTone } from "@/src/utils/sound";

export const useFlightGame = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = flightSocket.subscribe((message) => {
      const state = useGameStore.getState();
      if (message.event === "connection.ready") {
        state.pushNotification({
          tone: "success",
          title: "Connecté",
          message: "État officiel synchronisé.",
        });
      } else if (message.event === "round.started") {
        playArcadeTone(state.soundEnabled, 740, 0.11);
      } else if (message.event === "round.crashed") {
        state.pushNotification({
          tone: "warning",
          title: "CRASH!",
          message: `${Number(message.round?.crash_multiplier ?? 1).toFixed(2)}x`,
        });
        playArcadeTone(state.soundEnabled, 220, 0.18);
      } else if (message.event === "bet.accepted") {
        state.pushNotification({
          tone: "info",
          title: "Mise acceptée",
          message: "Le wallet officiel a été débité.",
        });
        playArcadeTone(state.soundEnabled, 520, 0.06);
      } else if (message.event === "cashout.accepted") {
        state.pushNotification({
          tone: "success",
          title: "Cashout accepté",
          message: `${String(message.data.payout)} ${state.currency}`,
        });
        playArcadeTone(state.soundEnabled, 880, 0.14);
      }
    });
    flightSocket.start();
    const reconnectOnNetwork = () => flightSocket.reconnect();
    const resyncOnVisibility = () => {
      if (document.visibilityState === "visible")
        flightSocket.requestSnapshot();
    };
    window.addEventListener("online", reconnectOnNetwork);
    document.addEventListener("visibilitychange", resyncOnVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener("online", reconnectOnNetwork);
      document.removeEventListener(
        "visibilitychange",
        resyncOnVisibility,
      );
      flightSocket.stop();
    };
  }, [enabled]);

  const placeBetAction = useCallback((betId: BetId) => {
    const state = useGameStore.getState();
    const bet = state.bets.find((item) => item.id === betId);
    if (!bet || bet.status !== "waiting") return;
    if (!state.authenticated) {
      state.pushNotification({
        tone: "warning",
        title: "Authentification requise",
        message: "Reconnectez-vous à votre compte VinParye.",
      });
      return;
    }
    if (
      state.currentRound?.status !== "BETTING_OPEN" ||
      !state.roundId
    ) {
      state.pushNotification({
        tone: "warning",
        title: "Mises fermées",
        message: "Attendez l'ouverture de la prochaine manche.",
      });
      return;
    }
    flightSocket.placeBet(state.roundId, bet);
  }, []);

  const cancelBetAction = useCallback((betId: BetId) => {
    const bet = useGameStore
      .getState()
      .bets.find((item) => item.id === betId);
    if (!bet?.serverBetUuid) return;
    flightSocket.cancel(bet.serverBetUuid);
  }, []);

  const cashOutBetAction = useCallback((betId: BetId) => {
    const bet = useGameStore
      .getState()
      .bets.find((item) => item.id === betId);
    if (!bet?.serverBetUuid || bet.status !== "placed") return;
    flightSocket.cashout(bet.serverBetUuid);
  }, []);

  return {
    placeBetAction,
    cancelBetAction,
    cashOutBetAction,
    reconnect: () => flightSocket.reconnect(),
  };
};
