import {
  DeleteEndorsementResponse,
  Endorsement,
  EndorseUserResponse,
  GetEndorsementsResponse,
  HealthResponse,
  PaginationParams,
  PointsHistoryResponse,
  PointsLeaderboardResponse,
  RewardsClientOptions,
  RewardsLeaderboardResponse,
  RewardsUserSummary,
  Signer,
  SubmitEndorsementResponse,
  UserPointsResponse
} from "./types.js";

function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const now = Date.now();
  const msHigh = Math.floor(now / 0x100000000);
  const msLow = now % 0x100000000;

  bytes[0] = (msHigh >>> 8) & 0xff;
  bytes[1] = msHigh & 0xff;
  bytes[2] = (msLow >>> 24) & 0xff;
  bytes[3] = (msLow >>> 16) & 0xff;
  bytes[4] = (msLow >>> 8) & 0xff;
  bytes[5] = msLow & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const DEFAULT_BASE_URL = "https://rewards.flashnet.xyz/v1";

export class RewardsApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "RewardsApiError";
    this.status = status;
    this.body = body;
  }
}

export class RewardsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: HeadersInit | undefined;

  constructor(options: RewardsClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.headers = options.headers;
  }

  async getRewardsLeaderboard(
    params: PaginationParams = {}
  ): Promise<RewardsLeaderboardResponse> {
    return this.request<RewardsLeaderboardResponse>(
      this.withPagination("/rewards/", params),
      { method: "GET" }
    );
  }

  async getRewardsUserSummary(pubkey: string): Promise<RewardsUserSummary> {
    return this.request<RewardsUserSummary>(
      `/rewards/${this.safePath(pubkey)}`,
      { method: "GET" }
    );
  }

  async getPointsLeaderboard(
    params: PaginationParams = {}
  ): Promise<PointsLeaderboardResponse> {
    return this.request<PointsLeaderboardResponse>(
      this.withPagination("/points/", params),
      { method: "GET" }
    );
  }

  async getUserPoints(pubkey: string): Promise<UserPointsResponse> {
    return this.request<UserPointsResponse>(`/points/${this.safePath(pubkey)}`, {
      method: "GET"
    });
  }

  async getPointsHistory(
    pubkey: string,
    params: PaginationParams = {}
  ): Promise<PointsHistoryResponse> {
    return this.request<PointsHistoryResponse>(
      this.withPagination(`/points/${this.safePath(pubkey)}/history`, params),
      { method: "GET" }
    );
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/stats/health", { method: "GET" });
  }

  async getEndorsements(pubkey: string): Promise<GetEndorsementsResponse> {
    return this.request<GetEndorsementsResponse>(
      `/rewards/${this.safePath(pubkey)}/endorsements`,
      { method: "GET" }
    );
  }

  private async createEndorsement(
    endorser: string,
    to: string,
    ratioBps: number,
    signer: Signer
  ): Promise<Endorsement> {
    if (!to || to.trim().length === 0) {
      throw new Error("createEndorsement requires a non-empty 'to' field.");
    }
    const timestampNonce = uuidv7();
    const yamlMessage = this.buildEndorsementYaml(endorser, to, ratioBps, timestampNonce);

    const signature = await signer.sign(yamlMessage);

    return {
      endorser,
      to,
      ratioBps,
      timestampNonce,
      signature
    };
  }

  private async submitEndorsement(
    userPk: string,
    endorsement: Endorsement
  ): Promise<SubmitEndorsementResponse> {
    return this.request<SubmitEndorsementResponse>(
      `/rewards/${this.safePath(userPk)}/endorsements`,
      {
        method: "POST",
        body: JSON.stringify(endorsement)
      }
    );
  }

  async endorseUser(
    userPk: string,
    to: string,
    ratioBps: number,
    signer: Signer
  ): Promise<EndorseUserResponse> {
    const endorsement = await this.createEndorsement(userPk, to, ratioBps, signer);

    const response = await this.submitEndorsement(userPk, endorsement);
    return { ...endorsement, ...response };
  }

  async deleteEndorsement(
    userPk: string,
    toPubkey: string,
    signer: Signer
  ): Promise<DeleteEndorsementResponse | null> {
    const timestampNonce = uuidv7();
    const yamlMessage = this.buildEndorsementDeleteYaml(userPk, toPubkey, timestampNonce);

    const signature = await signer.sign(yamlMessage);

    return this.request<DeleteEndorsementResponse | null>(
      `/rewards/${this.safePath(userPk)}/endorsements/${this.safePath(toPubkey)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ timestampNonce, signature })
      }
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = this.resolveUrl(path);
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(this.headers ?? {})
      }
    });

    const payload = await this.parseResponseBody(response);
    if (!response.ok) {
      throw new RewardsApiError(
        `Rewards API request failed (${response.status})`,
        response.status,
        payload
      );
    }

    return payload as T;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return text.length > 0 ? text : null;
  }

  private resolveUrl(path: string): string {
    if (!path) {
      return this.baseUrl;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  private withPagination(path: string, params: PaginationParams): string {
    const search = new URLSearchParams();
    if (typeof params.limit === "number") {
      search.set("limit", String(params.limit));
    }
    if (typeof params.offset === "number") {
      search.set("offset", String(params.offset));
    }

    const query = search.toString();
    if (!query) {
      return path;
    }

    return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
  }

  private buildEndorsementYaml(
    endorser: string,
    to: string,
    ratioBps: number,
    timestampNonce: string
  ): string {
    return [
      "kind: rewards_endorsement",
      "version: 1",
      "action: upsert",
      `endorser: ${JSON.stringify(endorser)}`,
      `to: ${JSON.stringify(to)}`,
      `ratioBps: ${ratioBps}`,
      `timestampNonce: ${JSON.stringify(timestampNonce)}`,
    ].join("\n");
  }

  private buildEndorsementDeleteYaml(
    endorser: string,
    to: string,
    timestampNonce: string
  ): string {
    return [
      "kind: rewards_endorsement",
      "version: 1",
      "action: delete",
      `endorser: ${JSON.stringify(endorser)}`,
      `to: ${JSON.stringify(to)}`,
      `timestampNonce: ${JSON.stringify(timestampNonce)}`,
    ].join("\n");
  }

  private safePath(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error("Expected a non-empty path value.");
    }

    return encodeURIComponent(value);
  }
}
