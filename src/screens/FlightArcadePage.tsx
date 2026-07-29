import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FlightScene } from "@/src/components/FlightScene";
import {
  GameAudio,
  unlockGameAudio,
} from "@/src/components/GameAudio";
import { GameInfoModal } from "@/src/components/GameInfoModal";
import { GameLoader } from "@/src/components/GameLoader";
import { BetPanel } from "@/src/components/MissionPanel";
import { PlayerSidebar } from "@/src/components/PlayerSidebar";
import { ToastStack } from "@/src/components/ToastStack";
import { TopBar } from "@/src/components/TopBar";
import { useFlightGame } from "@/src/hooks/useFlightGame";
import { useAssetPreloader } from "@/src/hooks/useAssetPreloader";
import { useGameStore } from "@/src/store/gameStore";

export const FlightArcadePage = () => {
  const [gameEntered, setGameEntered] = useState(false);
  const [audioGestureRequired, setAudioGestureRequired] =
    useState(false);
  const bets = useGameStore((state) => state.bets);
  const maximumBets = useGameStore(
    (state) => state.config.maximum_bets_per_player,
  );
  const toggleSound = useGameStore((state) => state.toggleSound);
  const assets = useAssetPreloader();
  const gameReady = assets.ready && gameEntered;
  const { placeBetAction, cancelBetAction, cashOutBetAction, reconnect } =
    useFlightGame(gameReady);
  const handleAutoplayStarted = useCallback(() => {
    setGameEntered(true);
  }, []);
  const handleAutoplayBlocked = useCallback(() => {
    setAudioGestureRequired(true);
  }, []);

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
    <main className="arcade-shell" aria-busy={!gameReady}>
      <GameAudio
        assetsReady={assets.ready}
        onAutoplayStarted={handleAutoplayStarted}
        onAutoplayBlocked={handleAutoplayBlocked}
      />
      <TopBar onReconnect={reconnect} />

      <div className="game-layout">
        <PlayerSidebar />

        <div className="game-stage">
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
        <span>AVIONU</span>
        <span>
          1 / {maximumBets || "—"} POUR PARIER OU CASHOUT
        </span>
      </footer>

      <ToastStack />
      <GameInfoModal />

      <AnimatePresence>
        {!gameEntered && (
          <GameLoader
            progress={assets.progress}
            ready={assets.ready}
            awaitingGesture={audioGestureRequired}
            onEnter={() => {
              unlockGameAudio();
              setGameEntered(true);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
};
