import { initialRoundHistory } from "@/src/mocks/roundHistory";
import type {
  BetId,
  FlightSocketEventName,
  FlightSocketEvents,
  HistoryEntry,
} from "@/src/types/game";
import { uid } from "@/src/utils/format";

type Listener<K extends FlightSocketEventName> = (
  payload: FlightSocketEvents[K],
) => void;

const generateCrashMultiplier = (): number => {
  const e = 2 ** 32;
  const h = Math.floor(Math.random() * e);
  if (h === 0) return 100;
  const r = (100 * e) / h;
  return Math.max(1, Math.floor(r) / 100);
};

const MULTIPLIER_GROWTH_PER_SEC = 0.08;

class MockFlightSocket {
  private listeners = new Map<FlightSocketEventName, Set<(value: never) => void>>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private roundId = "";
  private currentMultiplier = 1;
  private crashPoint = 1;
  private startedAt = 0;
  private history: HistoryEntry[] = [...initialRoundHistory];

  on<K extends FlightSocketEventName>(event: K, listener: Listener<K>) {
    const set =
      this.listeners.get(event) ?? new Set<(value: never) => void>();
    set.add(listener as (value: never) => void);
    this.listeners.set(event, set);
    return () => set.delete(listener as (value: never) => void);
  }

  private emit<K extends FlightSocketEventName>(
    event: K,
    payload: FlightSocketEvents[K],
  ) {
    this.listeners.get(event)?.forEach((listener) => listener(payload as never));
  }

  private later(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.emit("connection_status", { status: "connecting" });
    this.later(() => {
      if (!this.running) return;
      this.emit("connection_status", { status: "connected" });
      this.later(() => this.createRound(), 700);
    }, 620);
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.telemetryTimer = null;
  }

  reconnect() {
    if (!this.running) return;
    this.emit("connection_status", { status: "reconnecting" });
    this.later(
      () => this.emit("connection_status", { status: "connected" }),
      1100,
    );
  }

  private createRound() {
    if (!this.running) return;
    this.roundId = uid("round");
    this.currentMultiplier = 1;
    this.crashPoint = generateCrashMultiplier();
    this.emit("round_created", {
      roundId: this.roundId,
      createdAt: Date.now(),
    });
    this.countdown(5);
  }

  private countdown(remaining: number) {
    if (!this.running) return;
    this.emit("round_countdown", { roundId: this.roundId, remaining });

    if (remaining > 0) {
      this.later(() => this.countdown(remaining - 1), 900);
      return;
    }

    this.later(() => this.startRound(), 300);
  }

  private startRound() {
    if (!this.running) return;
    this.startedAt = performance.now();

    this.emit("round_started", {
      roundId: this.roundId,
      startedAt: Date.now(),
    });

    this.telemetryTimer = setInterval(() => {
      const elapsed = performance.now() - this.startedAt;
      const elapsedSec = elapsed / 1000;
      this.currentMultiplier = parseFloat(
        (1.01 + elapsedSec * MULTIPLIER_GROWTH_PER_SEC).toFixed(2),
      );

      if (this.currentMultiplier >= this.crashPoint) {
        this.currentMultiplier = this.crashPoint;
        this.crashRound();
        return;
      }

      this.emit("multiplier_update", {
        roundId: this.roundId,
        multiplier: this.currentMultiplier,
        elapsed,
      });
    }, 40);
  }

  private crashRound() {
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.telemetryTimer = null;

    const durationMs = performance.now() - this.startedAt;

    this.emit("round_crashed", {
      roundId: this.roundId,
      crashMultiplier: this.crashPoint,
      durationMs,
    });

    this.later(() => {
      const entry: HistoryEntry = {
        id: uid("history"),
        crashMultiplier: this.crashPoint,
      };
      this.history = [entry, ...this.history].slice(0, 50);
      this.emit("round_finished", {
        roundId: this.roundId,
        crashMultiplier: this.crashPoint,
      });
      this.emit("history_update", { entries: this.history });
      this.later(() => this.createRound(), 3000);
    }, 1500);
  }

  placeBet(betId: BetId, amount: number) {
    this.emit("bet_placed", {
      roundId: this.roundId,
      betId,
      amount,
    });
  }

  cashOut(betId: BetId, amount: number) {
    const winAmount = Math.round(amount * this.currentMultiplier);
    this.emit("bet_cashed_out", {
      roundId: this.roundId,
      betId,
      multiplier: this.currentMultiplier,
      winAmount,
    });
  }

  getCurrentMultiplier() {
    return this.currentMultiplier;
  }

  getCrashPoint() {
    return this.crashPoint;
  }
}

export const mockFlightSocket = new MockFlightSocket();
