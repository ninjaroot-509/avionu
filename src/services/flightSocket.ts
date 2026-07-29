"use client";

import type {
  Bet,
  FlightMessage,
  FlightSnapshot,
} from "@/src/types/game";
import { useGameStore } from "@/src/store/gameStore";

type MessageListener = (message: FlightMessage) => void;

const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readToken = () => {
  const queryToken = new URLSearchParams(window.location.search).get(
    "token",
  );
  if (queryToken) {
    sessionStorage.setItem("avionu-auth-token", queryToken);
    return queryToken;
  }
  return (
    sessionStorage.getItem("avionu-auth-token") ??
    localStorage.getItem("token") ??
    localStorage.getItem("authToken") ??
    sessionStorage.getItem("accessToken") ??
    ""
  );
};

const websocketUrl = () => {
  const configured = process.env.NEXT_PUBLIC_VINPARYE_WS_URL;
  const base =
    configured ??
    (window.location.hostname === "localhost"
      ? "ws://localhost:8000"
      : "wss://api.vinparye.com");
  const token = readToken();
  const url = new URL("/ws/games/flight/", base);
  if (token) url.searchParams.set("token", token);
  return url.toString();
};

class FlightSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<MessageListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private deadTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private intentionallyStopped = false;
  private pingRequests = new Map<string, number>();
  private snapshotPending = false;

  subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    )
      return;
    this.intentionallyStopped = false;
    void this.fetchRestSnapshot();
    this.connect();
  }

  stop() {
    this.intentionallyStopped = true;
    this.clearTimers();
    this.socket?.close(1000, "client stop");
    this.socket = null;
  }

  reconnect() {
    this.intentionallyStopped = false;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.retryCount = 0;
    this.connect();
  }

  placeBet(roundUuid: string, bet: Bet) {
    const requestId = createRequestId();
    useGameStore.getState().markBetPending(bet.id, requestId);
    this.send({
      action: "bet.place",
      request_id: requestId,
      round_uuid: roundUuid,
      amount: Number(bet.betAmount).toFixed(2),
      auto_cashout_multiplier: bet.autoCashOut
        ? Number(bet.autoCashOutTarget).toFixed(2)
        : null,
    });
  }

  cashout(betUuid: string) {
    this.send({
      action: "bet.cashout",
      request_id: createRequestId(),
      bet_uuid: betUuid,
    });
  }

  cancel(betUuid: string) {
    this.send({
      action: "bet.cancel",
      request_id: createRequestId(),
      bet_uuid: betUuid,
    });
  }

  requestSnapshot() {
    if (this.snapshotPending) return;
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.snapshotPending = false;
      void this.fetchRestSnapshot();
      return;
    }
    this.snapshotPending = true;
    this.send({
      action: "game.snapshot.request",
      request_id: createRequestId(),
    });
  }

  private connect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const store = useGameStore.getState();
    store.setConnection(
      this.retryCount === 0 ? "connecting" : "reconnecting",
    );
    try {
      this.socket = new WebSocket(websocketUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket.onopen = () => {
      this.retryCount = 0;
      store.setConnection("connected");
      this.requestSnapshot();
      this.startPing();
    };
    this.socket.onmessage = (event) => this.handleMessage(event.data);
    this.socket.onerror = () => {
      store.setConnection("offline");
    };
    this.socket.onclose = () => {
      this.clearHeartbeatTimers();
      this.socket = null;
      if (!this.intentionallyStopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionallyStopped) return;
    const store = useGameStore.getState();
    store.setConnection(navigator.onLine ? "reconnecting" : "offline");
    const settings = store.config.reconnection_settings;
    const maximumRetries = settings.maximum_retries ?? 20;
    if (this.retryCount >= maximumRetries) {
      store.setConnection("offline");
      return;
    }
    const base = settings.base_delay_ms ?? 500;
    const maximum = settings.maximum_delay_ms ?? 15000;
    const exponential = Math.min(
      maximum,
      base * 2 ** this.retryCount,
    );
    const jitter = exponential * (0.75 + Math.random() * 0.5);
    this.retryCount += 1;
    void this.fetchRestSnapshot();
    this.reconnectTimer = window.setTimeout(
      () => {
        this.reconnectTimer = null;
        this.connect();
      },
      jitter,
    );
  }

  private handleMessage(raw: string) {
    let message: FlightMessage;
    try {
      message = JSON.parse(raw) as FlightMessage;
    } catch {
      return;
    }
    const store = useGameStore.getState();
    this.armDeadConnectionTimer();
    if (message.event === "server.ping" && message.sequence === 0) {
      const requestId = String(message.data.request_id ?? "");
      const sentAt = this.pingRequests.get(requestId);
      if (sentAt !== undefined) {
        const receivedAt = Date.now();
        const latency = receivedAt - sentAt;
        const offset =
          message.server_time_ms - (sentAt + latency / 2);
        store.setNetworkTiming(latency, offset);
        this.pingRequests.delete(requestId);
      }
      return;
    }
    if (message.event === "game.snapshot") {
      this.snapshotPending = false;
      store.applySnapshot(
        message as FlightMessage & FlightSnapshot,
        message.sequence,
      );
      this.listeners.forEach((listener) => listener(message));
      return;
    }
    if (
      store.streamId &&
      message.stream_id &&
      message.stream_id !== store.streamId
    ) {
      this.requestSnapshot();
      return;
    }
    if (message.sequence > 0) {
      if (message.sequence <= store.sequence) return;
      if (store.sequence > 0 && message.sequence > store.sequence + 1) {
        this.requestSnapshot();
        return;
      }
    }
    store.applyMessage(message);
    if (
      message.event === "bets.updated" ||
      message.event === "bots.updated" ||
      message.event === "round.completed"
    ) {
      this.requestSnapshot();
    }
    if (
      message.event === "server.error" ||
      message.event === "bet.rejected" ||
      message.event === "cashout.rejected"
    ) {
      const details = message.data as {
        message?: string;
        code?: string;
      };
      store.pushNotification({
        tone: "warning",
        title: details.code ?? "Erreur",
        message: details.message ?? "Action refusée par le serveur.",
      });
      this.requestSnapshot();
    }
    this.listeners.forEach((listener) => listener(message));
  }

  private send(payload: Record<string, unknown>) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      useGameStore.getState().pushNotification({
        tone: "warning",
        title: "Connexion indisponible",
        message: "Reconnexion au serveur en cours.",
      });
      this.scheduleReconnect();
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  private async fetchRestSnapshot() {
    const configured = process.env.NEXT_PUBLIC_VINPARYE_API_URL;
    const base =
      configured ??
      (window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : "https://api.vinparye.com");
    const token = readToken();
    try {
      const response = await fetch(
        new URL("/api/v1/games/flight/snapshot/", base),
        {
          headers: token
            ? { Authorization: `Token ${token}` }
            : undefined,
          cache: "no-store",
        },
      );
      if (!response.ok) return;
      const snapshot = (await response.json()) as FlightSnapshot & {
        sequence: number;
      };
      useGameStore
        .getState()
        .applySnapshot(snapshot, snapshot.sequence ?? 0);
    } catch {
      // The WebSocket reconnection loop remains authoritative.
    }
  }

  private startPing() {
    this.clearHeartbeatTimers();
    const ping = () => {
      const requestId = createRequestId();
      const sentAt = Date.now();
      this.pingRequests.set(requestId, sentAt);
      this.send({
        action: "ping",
        request_id: requestId,
        client_time_ms: sentAt,
      });
    };
    ping();
    this.pingTimer = window.setInterval(ping, 5000);
    this.armDeadConnectionTimer();
  }

  private armDeadConnectionTimer() {
    if (this.deadTimer) window.clearTimeout(this.deadTimer);
    const timeout =
      useGameStore.getState().config.reconnection_settings
        .dead_connection_ms ?? 15000;
    this.deadTimer = window.setTimeout(() => {
      this.socket?.close(4000, "heartbeat timeout");
    }, timeout);
  }

  private clearHeartbeatTimers() {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    if (this.deadTimer) window.clearTimeout(this.deadTimer);
    this.pingTimer = null;
    this.deadTimer = null;
  }

  private clearTimers() {
    this.clearHeartbeatTimers();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

export const flightSocket = new FlightSocket();
