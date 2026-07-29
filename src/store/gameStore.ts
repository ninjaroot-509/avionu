"use client";

import { create } from "zustand";
import type {
  Bet,
  BetId,
  ConnectionStatus,
  FlightConfig,
  FlightMessage,
  FlightSnapshot,
  HistoryEntry,
  NotificationItem,
  PublicBet,
  RoundState,
  ServerBet,
  ServerRound,
} from "@/src/types/game";
import { clamp, uid } from "@/src/utils/format";

const EMPTY_CONFIG: FlightConfig = {
  enabled: false,
  maintenance: false,
  maintenance_text: "",
  currency: "HTG",
  min_bet: "0.00",
  max_bet: "0.00",
  maximum_bet_per_user: "0.00",
  maximum_bets_per_player: 0,
  maximum_active_bets: 0,
  max_auto_cashout: "0.00",
  betting_duration_ms: 0,
  preflight_duration_ms: 0,
  pause_duration_ms: 0,
  tick_interval_ms: 200,
  provably_fair_enabled: false,
  curve_version: "linear-v1",
  curve_parameters: {},
  reconnection_settings: {},
  config_version: 0,
};

const mapRoundState = (round: ServerRound | null): RoundState => {
  if (!round) return "waiting";
  if (round.status === "RUNNING") return "flying";
  if (round.status === "CRASHED" || round.status === "SETTLING")
    return "crashed";
  if (round.status === "COMPLETED" || round.status === "CANCELLED")
    return "finished";
  if (
    round.status === "SCHEDULED" ||
    round.status === "BETTING_OPEN" ||
    round.status === "BETTING_CLOSED"
  )
    return "countdown";
  return "waiting";
};

const mapBetStatus = (status: string): Bet["status"] => {
  if (status === "PENDING") return "pending";
  if (status === "ACCEPTED" || status === "ACTIVE") return "placed";
  if (status === "CASHED_OUT") return "cashed_out";
  if (status === "LOST" || status === "SETTLED") return "lost";
  if (status === "CANCELLED") return "cancelled";
  if (status === "REFUNDED") return "refunded";
  if (status === "REJECTED") return "rejected";
  return "waiting";
};

const createBet = (id: BetId, config: FlightConfig): Bet => ({
  id,
  name: `PARI ${String(id).padStart(2, "0")}`,
  betAmount: config.min_bet,
  autoCashOut: false,
  autoCashOutTarget: "2.00",
  status: "waiting",
  serverBetUuid: null,
  ticketRef: null,
  placedAt: null,
  winAmount: null,
  cashOutMultiplier: null,
});

const mergeServerBets = (
  current: Bet[],
  serverBets: ServerBet[],
  config: FlightConfig,
): Bet[] => {
  const size = Math.max(1, config.maximum_bets_per_player || current.length || 1);
  const slots = Array.from({ length: size }, (_, index) => {
    const existing = current[index] ?? createBet(index + 1, config);
    const serverBet =
      serverBets.find((item) => item.bet_uuid === existing.serverBetUuid) ??
      serverBets[index];
    if (!serverBet) {
      return {
        ...existing,
        status: "waiting",
        serverBetUuid: null,
        ticketRef: null,
        placedAt: null,
        winAmount: null,
        cashOutMultiplier: null,
      };
    }
    return {
      ...existing,
      betAmount: serverBet.amount,
      autoCashOut: Boolean(serverBet.auto_cashout_multiplier),
      autoCashOutTarget:
        serverBet.auto_cashout_multiplier ?? existing.autoCashOutTarget,
      status: mapBetStatus(serverBet.status),
      serverBetUuid: serverBet.bet_uuid,
      ticketRef: serverBet.ticket_ref,
      placedAt: Date.parse(serverBet.placed_at),
      winAmount: serverBet.final_payout,
      cashOutMultiplier: serverBet.cashout_multiplier
        ? Number(serverBet.cashout_multiplier)
        : null,
    };
  });
  return slots;
};

const historyFromRounds = (rounds: ServerRound[]): HistoryEntry[] =>
  rounds
    .filter((round) => round.crash_multiplier !== null)
    .map((round) => ({
      id: round.round_uuid,
      crashMultiplier: Number(round.crash_multiplier),
    }));

interface GameState {
  connection: ConnectionStatus;
  streamId: string;
  sequence: number;
  clockOffsetMs: number;
  latencyMs: number | null;
  connectionQuality: "good" | "fair" | "poor" | "offline";
  config: FlightConfig;
  currentRound: ServerRound | null;
  roundState: RoundState;
  roundId: string;
  countdown: number;
  multiplier: number;
  elapsed: number;
  crashMultiplier: number | null;
  history: HistoryEntry[];
  publicBets: PublicBet[];
  historyExpanded: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  menuOpen: boolean;
  selectedAvatar: number;
  authenticated: boolean;
  displayName: string;
  balance: string;
  currency: string;
  bets: Bet[];
  notifications: NotificationItem[];
  setConnection: (status: ConnectionStatus) => void;
  setNetworkTiming: (latencyMs: number, clockOffsetMs: number) => void;
  applyMessage: (message: FlightMessage) => void;
  applySnapshot: (snapshot: FlightSnapshot, sequence: number) => void;
  markBetPending: (id: BetId, requestId: string) => void;
  updateBet: (id: BetId, patch: Partial<Bet>) => void;
  toggleHistory: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleMenu: () => void;
  closeMenu: () => void;
  setSelectedAvatar: (avatar: number) => void;
  pushNotification: (
    notification: Omit<NotificationItem, "id">,
  ) => void;
  dismissNotification: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  connection: "connecting",
  streamId: "",
  sequence: 0,
  clockOffsetMs: 0,
  latencyMs: null,
  connectionQuality: "offline",
  config: EMPTY_CONFIG,
  currentRound: null,
  roundState: "waiting",
  roundId: "",
  countdown: 0,
  multiplier: 1,
  elapsed: 0,
  crashMultiplier: null,
  history: [],
  publicBets: [],
  historyExpanded: false,
  soundEnabled: true,
  musicEnabled: true,
  menuOpen: false,
  selectedAvatar: 0,
  authenticated: false,
  displayName: "",
  balance: "0.00",
  currency: "HTG",
  bets: [createBet(1, EMPTY_CONFIG), createBet(2, EMPTY_CONFIG)],
  notifications: [],

  setConnection: (connection) =>
    set({
      connection,
      connectionQuality:
        connection === "offline" ? "offline" : get().connectionQuality,
    }),

  setNetworkTiming: (latencyMs, clockOffsetMs) =>
    set({
      latencyMs,
      clockOffsetMs,
      connectionQuality:
        latencyMs < 250 ? "good" : latencyMs < 700 ? "fair" : "poor",
    }),

  applySnapshot: (snapshot, sequence) =>
    set((state) => {
      const round = snapshot.round;
      return {
        streamId: snapshot.stream_id,
        sequence,
        config: snapshot.config,
        currentRound: round,
        roundState: mapRoundState(round),
        roundId: round?.round_uuid ?? "",
        countdown: round
          ? Math.max(
              0,
              Math.ceil(
                ((round.status === "BETTING_CLOSED"
                  ? round.started_at_ms
                  : round.betting_close_at_ms) -
                  (Date.now() + state.clockOffsetMs)) /
                  1000,
              ),
            )
          : 0,
        multiplier: Number(round?.expected_multiplier ?? "1"),
        elapsed: round?.elapsed_ms ?? 0,
        crashMultiplier: round?.crash_multiplier
          ? Number(round.crash_multiplier)
          : null,
        authenticated: snapshot.player.authenticated,
        displayName: snapshot.player.display_name,
        balance: snapshot.player.balance,
        currency: snapshot.player.currency,
        bets: mergeServerBets(
          state.bets,
          snapshot.player.active_bets,
          snapshot.config,
        ),
        history: historyFromRounds(snapshot.recent_rounds),
        publicBets: snapshot.public_bets,
      };
    }),

  applyMessage: (message) =>
    set((state) => {
      if (message.event === "game.snapshot") {
        return state;
      }
      const round = message.round ?? state.currentRound;
      const patch: Partial<GameState> = {
        streamId: message.stream_id || state.streamId,
        sequence:
          message.sequence > 0 ? message.sequence : state.sequence,
      };
      if (message.event === "game.config" && message.data.config) {
        const incomingConfig = message.data.config as FlightConfig;
        if (
          !state.currentRound ||
          state.currentRound.configuration_version ===
            incomingConfig.config_version
        ) {
          patch.config = incomingConfig;
        }
      }
      if (round) {
        patch.currentRound = round;
        patch.roundState = mapRoundState(round);
        patch.roundId = round.round_uuid;
        patch.multiplier = Number(
          (message.data.expected_multiplier as string | undefined) ??
            round.expected_multiplier,
        );
        patch.elapsed = Number(
          (message.data.elapsed_ms as number | undefined) ??
            round.elapsed_ms,
        );
        patch.crashMultiplier = round.crash_multiplier
          ? Number(round.crash_multiplier)
          : null;
        const deadline =
          round.status === "BETTING_CLOSED"
            ? round.started_at_ms
            : round.betting_close_at_ms;
        patch.countdown = Math.max(
          0,
          Math.ceil(
            (deadline - (Date.now() + state.clockOffsetMs)) / 1000,
          ),
        );
      }
      if (message.event === "wallet.updated") {
        patch.balance = String(message.data.balance ?? state.balance);
        patch.currency = String(message.data.currency ?? state.currency);
      }
      if (
        message.event === "bet.accepted" ||
        message.event === "bet.updated"
      ) {
        const serverBet = message.data.bet as ServerBet | undefined;
        if (serverBet) {
          patch.bets = mergeServerBets(
            state.bets,
            [
              ...state.bets
                .filter((bet) => bet.serverBetUuid && bet.serverBetUuid !== serverBet.bet_uuid)
                .map((bet) => ({
                  bet_uuid: bet.serverBetUuid as string,
                  round_uuid: state.roundId,
                  ticket_ref: bet.ticketRef ?? "",
                  amount: bet.betAmount,
                  currency: state.currency,
                  auto_cashout_multiplier: bet.autoCashOut
                    ? bet.autoCashOutTarget
                    : null,
                  cashout_multiplier: bet.cashOutMultiplier
                    ? String(bet.cashOutMultiplier)
                    : null,
                  potential_payout: "0.00",
                  final_payout: bet.winAmount ?? "0.00",
                  status:
                    bet.status === "placed"
                      ? "ACTIVE"
                      : bet.status === "cashed_out"
                        ? "CASHED_OUT"
                        : bet.status.toUpperCase(),
                  client_request_id: "",
                  placed_at: new Date(bet.placedAt ?? Date.now()).toISOString(),
                  cashed_out_at: null,
                  settled_at: null,
                })),
              serverBet,
            ],
            state.config,
          );
        }
        if (message.data.balance) patch.balance = String(message.data.balance);
      }
      if (message.event === "cashout.accepted") {
        const betUuid = String(message.data.bet_uuid ?? "");
        patch.bets = state.bets.map((bet) =>
          bet.serverBetUuid === betUuid
            ? {
                ...bet,
                status: "cashed_out",
                cashOutMultiplier: Number(message.data.cashout_multiplier),
                winAmount: String(message.data.payout),
              }
            : bet,
        );
        patch.balance = String(message.data.balance ?? state.balance);
      }
      return patch;
    }),

  markBetPending: (id, requestId) =>
    set((state) => ({
      bets: state.bets.map((bet) =>
        bet.id === id
          ? { ...bet, status: "pending", serverBetUuid: requestId }
          : bet,
      ),
    })),

  updateBet: (id, patch) =>
    set((state) => {
      const minimum = Number(state.config.min_bet);
      const maximum = Number(state.config.max_bet);
      const maxAuto = Number(state.config.max_auto_cashout);
      return {
        bets: state.bets.map((bet) =>
          bet.id === id
            ? {
                ...bet,
                ...patch,
                betAmount:
                  patch.betAmount === undefined
                    ? bet.betAmount
                    : String(
                        clamp(
                          Number(patch.betAmount),
                          minimum,
                          maximum,
                        ).toFixed(2),
                      ),
                autoCashOutTarget:
                  patch.autoCashOutTarget === undefined
                    ? bet.autoCashOutTarget
                    : String(
                        clamp(
                          Number(patch.autoCashOutTarget),
                          1.01,
                          maxAuto,
                        ).toFixed(2),
                      ),
              }
            : bet,
        ),
      };
    }),

  toggleHistory: () =>
    set((state) => ({ historyExpanded: !state.historyExpanded })),
  toggleSound: () =>
    set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleMusic: () =>
    set((state) => ({ musicEnabled: !state.musicEnabled })),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),
  setSelectedAvatar: (selectedAvatar) =>
    set({ selectedAvatar: Math.round(clamp(selectedAvatar, 0, 14)) }),

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
