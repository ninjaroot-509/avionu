"use client";

import { create } from "zustand";
import { initialRoundHistory } from "@/src/mocks/roundHistory";
import type {
  Bet,
  BetId,
  ConnectionStatus,
  HistoryEntry,
  NotificationItem,
  RoundState,
} from "@/src/types/game";
import { clamp, uid } from "@/src/utils/format";

const INITIAL_BALANCE = 10000;

const createBet = (id: BetId): Bet => ({
  id,
  name: `PARI ${String(id).padStart(2, "0")}`,
  betAmount: id === 1 ? 500 : 250,
  autoCashOut: false,
  autoCashOutTarget: 2.0,
  status: "waiting",
  placedAt: null,
  winAmount: null,
  cashOutMultiplier: null,
});

interface GameState {
  connection: ConnectionStatus;
  roundState: RoundState;
  roundId: string;
  countdown: number;
  multiplier: number;
  elapsed: number;
  crashMultiplier: number | null;
  history: HistoryEntry[];
  historyExpanded: boolean;
  soundEnabled: boolean;
  menuOpen: boolean;
  balance: number;
  bets: [Bet, Bet];
  notifications: NotificationItem[];
  setConnection: (status: ConnectionStatus) => void;
  setRoundCreated: (roundId: string) => void;
  setCountdown: (remaining: number) => void;
  setRoundStarted: (roundId: string) => void;
  setMultiplier: (multiplier: number, elapsed: number) => void;
  setCrashed: (crashMultiplier: number) => void;
  setRoundFinished: () => void;
  setHistory: (entries: HistoryEntry[]) => void;
  toggleHistory: () => void;
  toggleSound: () => void;
  toggleMenu: () => void;
  updateBet: (id: BetId, patch: Partial<Bet>) => void;
  placeBet: (id: BetId) => void;
  cancelBet: (id: BetId) => void;
  cashOutBet: (id: BetId, winAmount: number, multiplier: number) => void;
  settleBet: (id: BetId) => void;
  pushNotification: (
    notification: Omit<NotificationItem, "id">,
  ) => void;
  dismissNotification: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  connection: "connecting",
  roundState: "waiting",
  roundId: "",
  countdown: 5,
  multiplier: 1,
  elapsed: 0,
  crashMultiplier: null,
  history: initialRoundHistory,
  historyExpanded: false,
  soundEnabled: true,
  menuOpen: false,
  balance: INITIAL_BALANCE,
  bets: [createBet(1), createBet(2)],
  notifications: [],

  setConnection: (connection) => set({ connection }),

  setRoundCreated: (roundId) =>
    set((state) => ({
      roundId,
      roundState: "waiting",
      countdown: 5,
      multiplier: 1,
      elapsed: 0,
      crashMultiplier: null,
      bets: state.bets.map((bet) => ({
        ...bet,
        status: bet.status === "cashed_out" || bet.status === "lost"
          ? "waiting"
          : bet.status,
        winAmount: null,
        cashOutMultiplier: null,
        placedAt: null,
      })) as [Bet, Bet],
    })),

  setCountdown: (countdown) =>
    set({ roundState: "countdown", countdown }),

  setRoundStarted: (roundId) =>
    set({ roundId, roundState: "flying" }),

  setMultiplier: (multiplier, elapsed) =>
    set({ multiplier, elapsed }),

  setCrashed: (crashMultiplier) =>
    set((state) => ({
      roundState: "crashed",
      crashMultiplier,
      multiplier: crashMultiplier,
      bets: state.bets.map((bet) => ({
        ...bet,
        status: bet.status === "placed" ? "lost" : bet.status,
      })) as [Bet, Bet],
    })),

  setRoundFinished: () => set({ roundState: "finished" }),
  setHistory: (history) => set({ history }),
  toggleHistory: () =>
    set((state) => ({ historyExpanded: !state.historyExpanded })),
  toggleSound: () =>
    set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),

  updateBet: (id, patch) =>
    set((state) => ({
      bets: state.bets.map((bet) =>
        bet.id === id
          ? {
              ...bet,
              ...patch,
              betAmount:
                patch.betAmount === undefined
                  ? bet.betAmount
                  : Math.round(clamp(patch.betAmount, 10, 999999)),
              autoCashOutTarget:
                patch.autoCashOutTarget === undefined
                  ? bet.autoCashOutTarget
                  : clamp(patch.autoCashOutTarget, 1.1, 100),
            }
          : bet,
      ) as [Bet, Bet],
    })),

  placeBet: (id) =>
    set((state) => {
      const bet = state.bets.find((b) => b.id === id);
      if (!bet || state.balance < bet.betAmount) return state;
      return {
        balance: state.balance - bet.betAmount,
        bets: state.bets.map((b) =>
          b.id === id
            ? { ...b, status: "placed" as const, placedAt: Date.now() }
            : b,
        ) as [Bet, Bet],
      };
    }),

  cancelBet: (id) =>
    set((state) => {
      const bet = state.bets.find((b) => b.id === id);
      if (!bet || bet.status !== "placed") return state;
      return {
        balance: state.balance + bet.betAmount,
        bets: state.bets.map((b) =>
          b.id === id
            ? { ...b, status: "waiting" as const, placedAt: null }
            : b,
        ) as [Bet, Bet],
      };
    }),

  cashOutBet: (id, winAmount, multiplier) =>
    set((state) => ({
      balance: state.balance + winAmount,
      bets: state.bets.map((bet) =>
        bet.id === id
          ? {
              ...bet,
              status: "cashed_out" as const,
              winAmount,
              cashOutMultiplier: multiplier,
            }
          : bet,
      ) as [Bet, Bet],
    })),

  settleBet: (id) =>
    set((state) => ({
      bets: state.bets.map((bet) =>
        bet.id === id && bet.status === "placed"
          ? { ...bet, status: "lost" as const }
          : bet,
      ) as [Bet, Bet],
    })),

  pushNotification: (notification) => {
    const id = uid("notice");
    set((state) => ({
      notifications: [
        ...state.notifications.slice(-3),
        { id, ...notification },
      ],
    }));
    window.setTimeout(() => get().dismissNotification(id), 4000);
  },

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),
}));
