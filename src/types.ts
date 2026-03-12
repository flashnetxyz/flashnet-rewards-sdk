export interface Signer {
  sign(message: string): Promise<string> | string;
}

export interface RewardsClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

export interface Endorsement {
  endorser: string;
  to: string;
  ratioBps: number;
  timestampNonce: string;
  signature: string;
}

export interface SubmitEndorsementResponse {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface EndorseUserResponse
  extends Endorsement,
    SubmitEndorsementResponse {}

export interface EndorsementEntry {
  to: string;
  ratioBps: number;
}

export interface GetEndorsementsResponse {
  endorser: string;
  endorsements: EndorsementEntry[];
}

export interface DeleteEndorsementRequest {
  timestampNonce: string;
  signature: string;
}

export interface DeleteEndorsementResponse {
  status?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface BalanceInfo {
  raw: string;
  display: string;
}

export interface RewardsLeaderboardEntry {
  pubkey: string;
  usdbBalance: BalanceInfo;
  volumeUtcToday: { swapSats: number; swapCount: number };
  rewardsBracket: number;
  rewardsPercent: number;
  estimatedSatsToday: number;
  [key: string]: unknown;
}

export interface RewardsLeaderboardResponse {
  rewards: RewardsLeaderboardEntry[];
  meta: PaginationMeta;
}

export interface RewardsUserSummary {
  pubkey: string;
  usdbBalance: BalanceInfo;
  volumeUtcToday: { swapSats: number; swapCount: number };
  rewardsBracket: number;
  rewardsPercent: number;
  estimatedSatsToday: number;
  [key: string]: unknown;
}

export interface PointsLeaderboardEntry {
  pubkey: string;
  currentPoints: number;
  lifetimePoints: number;
  rank: number;
  projectedDailyPoints: number;
  volumeUtcToday: { swapSats: number; liquiditySats: number };
  [key: string]: unknown;
}

export interface PointsLeaderboardResponse {
  points: PointsLeaderboardEntry[];
  meta: PaginationMeta;
}

export interface UserPointsResponse {
  pubkey: string;
  currentPoints: number;
  lifetimePoints: number;
  rank: number;
  projectedDailyPoints: number;
  volumeUtcToday: { swapSats: number; liquiditySats: number };
  [key: string]: unknown;
}

export interface PointsHistoryEvent {
  type: string;
  points: number;
  day: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
}

export interface PointsHistoryResponse {
  pubkey: string;
  events: PointsHistoryEvent[];
  pagination: PaginationMeta;
}

export interface HealthResponse {
  status: string;
  lastPointsDay?: string;
  lastPayoutDay?: string;
  [key: string]: unknown;
}
