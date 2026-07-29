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
  enabled: boolean;
  maintenance: boolean;
  maintenance_text: string;
  currency: string;
  min_bet: string;
  max_bet: string;
  maximum_bet_per_user: string;
  maximum_bets_per_player: number;
  maximum_active_bets: number;
  max_auto_cashout: string;
  betting_duration_ms: number;
  preflight_duration_ms: number;
  pause_duration_ms: number;
  tick_interval_ms: number;
  provably_fair_enabled: boolean;
  curve_version: string;
  curve_parameters: {
    start_multiplier?: string;
    growth_per_second?: string;
  };
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
  betting_open_at_ms: number;
  betting_close_at_ms: number;
  started_at_ms: number;
  crashed_at_ms: number | null;
  completed_at: string | null;
  next_round_at_ms: number | null;
  elapsed_ms: number;
  expected_multiplier: string;
  crash_multiplier: string | null;
  server_seed_hash: string;
  server_seed: string;
  client_seed: string;
  nonce: number;
  animation_seed: string;
  animation_profile: Record<string, string | number>;
  curve_version: string;
  curve_parameters: Record<string, string>;
  configuration_version: number;
  total_bets: string;
  total_paid: string;
  player_count: number;
  bot_count: number;
}

export interface ServerBet {
  bet_uuid: string;
  round_uuid: string;
  ticket_ref: string;
  amount: string;
  currency: string;
  auto_cashout_multiplier: string | null;
  cashout_multiplier: string | null;
  potential_payout: string;
  final_payout: string;
  status: string;
  client_request_id: string;
  placed_at: string;
  cashed_out_at: string | null;
  settled_at: string | null;
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
  limits: Record<string, string | number>;
}

export interface FlightSnapshot {
  stream_id: string;
  config: FlightConfig;
  round: ServerRound | null;
  player: FlightPlayerSnapshot;
  recent_rounds: ServerRound[];
  next_round: ServerRound | null;
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
  config?: FlightConfig;
  player?: FlightPlayerSnapshot;
  recent_rounds?: ServerRound[];
  next_round?: ServerRound | null;
  public_bets?: PublicBet[];
}
