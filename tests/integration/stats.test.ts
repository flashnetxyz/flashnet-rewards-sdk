import { describe, it, expect } from "vitest";
import { RewardsClient } from "../../src/index.js";

const client = new RewardsClient();

describe("Stats API", () => {
  it("should fetch health", async () => {
    const result = await client.getHealth();

    expect(result).toBeDefined();
    expect(result.status).toBe("healthy");
    expect(result.lastPointsDay).toBeTruthy();
    expect(result.lastPayoutDay).toBeTruthy();
  });
});
