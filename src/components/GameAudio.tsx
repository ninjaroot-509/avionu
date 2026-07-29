import { useEffect, useRef } from "react";
import { useGameStore } from "@/src/store/gameStore";
import type { RoundState } from "@/src/types/game";

interface GameAudioProps {
  assetsReady: boolean;
  onAutoplayStarted: () => void;
  onAutoplayBlocked: () => void;
}

const GAME_AUDIO_UNLOCK_EVENT = "avionu:unlock-audio";

export const unlockGameAudio = () => {
  window.dispatchEvent(new Event(GAME_AUDIO_UNLOCK_EVENT));
};

export const GameAudio = ({
  assetsReady,
  onAutoplayStarted,
  onAutoplayBlocked,
}: GameAudioProps) => {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const musicEnabled = useGameStore((state) => state.musicEnabled);
  const roundState = useGameStore((state) => state.roundState);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const crashRef = useRef<HTMLAudioElement | null>(null);
  const previousRoundState = useRef<RoundState>(roundState);

  useEffect(() => {
    const music = new Audio("/sounds/bg-music.mp3");
    const crash = new Audio("/sounds/fly-away.mp3");

    music.loop = true;
    music.preload = "auto";
    music.volume = 0.16;
    crash.preload = "auto";
    crash.volume = 0.68;

    musicRef.current = music;
    crashRef.current = crash;

    const startFromUserGesture = () => {
      if (!useGameStore.getState().musicEnabled) return;
      void music.play().catch(() => {
        // The browser can still reject audio when the document is inactive.
      });
    };

    window.addEventListener(
      GAME_AUDIO_UNLOCK_EVENT,
      startFromUserGesture,
    );

    return () => {
      window.removeEventListener(
        GAME_AUDIO_UNLOCK_EVENT,
        startFromUserGesture,
      );
      music.pause();
      crash.pause();
      music.src = "";
      crash.src = "";
      musicRef.current = null;
      crashRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    if (!assetsReady || !musicEnabled) {
      music.pause();
      return;
    }

    const startMusic = () => {
      void music.play().then(onAutoplayStarted).catch(onAutoplayBlocked);
    };

    startMusic();
    window.addEventListener("pointerdown", startMusic, { once: true });
    window.addEventListener("keydown", startMusic, { once: true });

    return () => {
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
    };
  }, [
    assetsReady,
    musicEnabled,
    onAutoplayBlocked,
    onAutoplayStarted,
  ]);

  useEffect(() => {
    if (soundEnabled) return;
    const crash = crashRef.current;
    if (!crash) return;
    crash.pause();
    crash.currentTime = 0;
  }, [soundEnabled]);

  useEffect(() => {
    const justCrashed =
      roundState === "crashed" &&
      previousRoundState.current !== "crashed";
    previousRoundState.current = roundState;

    if (!justCrashed || !assetsReady || !soundEnabled) return;

    const crash = crashRef.current;
    if (!crash) return;
    crash.currentTime = 0;
    void crash.play().catch(() => {
      // The next user interaction will still unlock background audio.
    });
  }, [assetsReady, roundState, soundEnabled]);

  return null;
};
