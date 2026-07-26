"use client";

import { useEffect } from "react";
import { FlightScene } from "@/src/components/FlightScene";
import { HistoryRibbon } from "@/src/components/HistoryRibbon";
import { BetPanel } from "@/src/components/MissionPanel";
import { PlayerSidebar } from "@/src/components/PlayerSidebar";
import { ToastStack } from "@/src/components/ToastStack";
import { TopBar } from "@/src/components/TopBar";
import { useFlightGame } from "@/src/hooks/useFlightGame";
import { useGameStore } from "@/src/store/gameStore";

export const FlightArcadePage = () => {
  const bets = useGameStore((state) => state.bets);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const { placeBetAction, cancelBetAction, cashOutBetAction, reconnect } = useFlightGame();

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "BUTTON" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (event.key === "1" || event.key === "2") {
        const betId = Number(event.key) as 1 | 2;
        const bet = useGameStore
          .getState()
          .bets.find((b) => b.id === betId);
        if (bet?.status === "placed") cashOutBetAction(betId);
        else placeBetAction(betId);
      }

      if (event.key.toLowerCase() === "m") toggleSound();
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [placeBetAction, cashOutBetAction, toggleSound]);

  return (
    <main className="arcade-shell">
      <TopBar onReconnect={reconnect} />

      <div className="game-layout">
        <PlayerSidebar />

        <div className="game-stage">
          <HistoryRibbon />
          <FlightScene />

          <section className="mission-grid" aria-label="Slots de pari">
            {bets.map((bet) => (
              <BetPanel
                bet={bet}
                onPlaceBet={placeBetAction}
                onCancelBet={cancelBetAction}
                onCashOut={cashOutBetAction}
                key={bet.id}
              />
            ))}
          </section>
        </div>
      </div>

      <footer className="arcade-footer">
        <span>VINPARYE AVIATOR</span>
        <span>
          1 / 2 POUR PARIER OU CASHOUT
        </span>
      </footer>

      <ToastStack />
    </main>
  );
};
