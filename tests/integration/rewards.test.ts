import { describe, it, expect } from "vitest";
import { RewardsClient } from "../../src/index.js";

const client = new RewardsClient();

describe("Rewards API", () => {
  let knownPubkey: string;

  it("should fetch rewards leaderboard with pagination", async () => {
    const result = await client.getRewardsLeaderboard({ limit: 3, offset: 0 });

    expect(result).toBeDefined();
    expect(Array.isArray(result.rewards)).toBe(true);
    expect(result.rewards.length).toBeGreaterThan(0);
    expect(result.rewards.length).toBeLessThanOrEqual(3);
    expect(result.meta).toBeDefined();
    expect(result.meta.limit).toBe(3);
    expect(result.meta.offset).toBe(0);
    expect(typeof result.meta.total).toBe("number");

    const entry = result.rewards[0];
    expect(entry.pubkey).toBeTruthy();
    expect(entry.usdbBalance).toBeDefined();
    expect(typeof entry.rewardsPercent).toBe("number");

    knownPubkey = entry.pubkey;
  });

  it("should fetch rewards leaderboard with default params", async () => {
    const result = await client.getRewardsLeaderboard();

    expect(Array.isArray(result.rewards)).toBe(true);
    expect(result.rewards.length).toBeGreaterThan(0);
  });

  it("should respect offset in pagination", async () => {
    const page1 = await client.getRewardsLeaderboard({ limit: 1, offset: 0 });
    const page2 = await client.getRewardsLeaderboard({ limit: 1, offset: 1 });

    expect(page1.rewards[0].pubkey).not.toBe(page2.rewards[0].pubkey);
  });

  it("should fetch user rewards summary", async () => {
    const result = await client.getRewardsUserSummary(knownPubkey);

    expect(result).toBeDefined();
    expect(result.pubkey).toBe(knownPubkey);
    expect(result.usdbBalance).toBeDefined();
    expect(typeof result.usdbBalance.raw).toBe("string");
    expect(typeof result.usdbBalance.display).toBe("string");
    expect(typeof result.rewardsBracket).toBe("number");
    expect(typeof result.rewardsPercent).toBe("number");
    expect(typeof result.estimatedSatsToday).toBe("number");
  });
});
