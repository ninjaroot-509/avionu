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
  | "pending"
  | "placed"
  | "cashed_out"
  | "lost"
  | "cancelled"
  | "refunded"
  | "rejected";

export type BetId = number;

export interface FlightConfig {
  currency: string;
  min_bet: string;
  max_bet: string;
  maximum_bet_per_user: string;
  maximum_bets_per_player: number;
  max_auto_cashout: string;
  reconnection_settings: {
    base_delay_ms?: number;
    maximum_delay_ms?: number;
    maximum_retries?: number;
    dead_connection_ms?: number;
  };
  config_version: number;
}

export interface ServerRound {
  round_uuid: string;
  round_number: number;
  status: string;
  betting_close_at_ms: number;
  started_at_ms: number;
  crashed_at_ms: number | null;
  elapsed_ms: number;
  expected_multiplier: string;
  crash_multiplier: string | null;
  server_seed_hash: string;
  server_seed: string;
  client_seed: string;
  nonce: number;
  animation_seed: string;
  animation_profile: Record<string, string | number>;
  configuration_version: number;
  total_paid: string;
  player_count: number;
  bot_count: number;
}

export interface ServerBet {
  bet_uuid: string;
  client_request_id: string;
  ticket_ref: string;
  amount: string;
  auto_cashout_multiplier: string | null;
  cashout_multiplier: string | null;
  final_payout: string;
  status: string;
  placed_at: string;
}

export interface ServerRoundHistory {
  round_uuid: string;
  crash_multiplier: string;
}

export interface PublicBet {
  bet_uuid: string;
  player: string;
  is_bot: boolean;
  amount: string;
  currency: string;
  status: string;
  cashout_multiplier: string | null;
  payout: string;
}

export interface HistoryEntry {
  id: string;
  crashMultiplier: number;
}

export interface Bet {
  id: BetId;
  name: string;
  betAmount: string;
  autoCashOut: boolean;
  autoCashOutTarget: string;
  status: BetStatus;
  clientRequestId: string | null;
  serverBetUuid: string | null;
  ticketRef: string | null;
  placedAt: number | null;
  winAmount: string | null;
  cashOutMultiplier: number | null;
}

export interface NotificationItem {
  id: string;
  tone: "success" | "warning" | "info";
  title: string;
  message: string;
}

export interface FlightPlayerSnapshot {
  authenticated: boolean;
  display_name: string;
  balance: string;
  currency: string;
  active_bets: ServerBet[];
}

export interface FlightSnapshot {
  stream_id: string;
  sequence: number;
  config: FlightConfig;
  round: ServerRound | null;
  player: FlightPlayerSnapshot;
  recent_rounds: ServerRoundHistory[];
  public_bets: PublicBet[];
}

export interface FlightMessage {
  event: string;
  version: number;
  stream_id: string;
  server_time: string;
  server_time_ms: number;
  sequence: number;
  round: ServerRound | null;
  data: Record<string, unknown>;
}
