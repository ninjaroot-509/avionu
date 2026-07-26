export type RoundState =
  | "waiting"
  | "countdown"
  | "flying"
  | "crashed"
  | "finished";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type BetStatus =
  | "waiting"
  | "placed"
  | "cashed_out"
  | "lost";

export type BetId = 1 | 2;

export interface HistoryEntry {
  id: string;
  crashMultiplier: number;
}

export interface Bet {
  id: BetId;
  name: string;
  betAmount: number;
  autoCashOut: boolean;
  autoCashOutTarget: number;
  status: BetStatus;
  placedAt: number | null;
  winAmount: number | null;
  cashOutMultiplier: number | null;
}

export interface NotificationItem {
  id: string;
  tone: "success" | "warning" | "info";
  title: string;
  message: string;
}

export interface FlightSocketEvents {
  connection_status: { status: ConnectionStatus };
  round_created: { roundId: string; createdAt: number };
  round_countdown: { roundId: string; remaining: number };
  round_started: { roundId: string; startedAt: number };
  multiplier_update: {
    roundId: string;
    multiplier: number;
    elapsed: number;
  };
  bet_placed: {
    roundId: string;
    betId: BetId;
    amount: number;
  };
  bet_cashed_out: {
    roundId: string;
    betId: BetId;
    multiplier: number;
    winAmount: number;
  };
  round_crashed: {
    roundId: string;
    crashMultiplier: number;
    durationMs: number;
  };
  round_finished: {
    roundId: string;
    crashMultiplier: number;
  };
  history_update: { entries: HistoryEntry[] };
}

export type FlightSocketEventName = keyof FlightSocketEvents;
