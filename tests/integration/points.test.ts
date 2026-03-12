import { describe, it, expect } from "vitest";
import { RewardsClient } from "../../src/index.js";

const client = new RewardsClient();

describe("Points API", () => {
  let knownPubkey: string;

  it("should fetch points leaderboard with pagination", async () => {
    const result = await client.getPointsLeaderboard({ limit: 3, offset: 0 });

    expect(result).toBeDefined();
    expect(Array.isArray(result.points)).toBe(true);
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.points.length).toBeLessThanOrEqual(3);
    expect(result.meta).toBeDefined();
    expect(result.meta.limit).toBe(3);
    expect(result.meta.offset).toBe(0);
    expect(typeof result.meta.total).toBe("number");

    const entry = result.points[0];
    expect(entry.pubkey).toBeTruthy();
    expect(typeof entry.currentPoints).toBe("number");
    expect(typeof entry.lifetimePoints).toBe("number");
    expect(typeof entry.rank).toBe("number");

    knownPubkey = entry.pubkey;
  });

  it("should fetch points leaderboard with default params", async () => {
    const result = await client.getPointsLeaderboard();

    expect(Array.isArray(result.points)).toBe(true);
    expect(result.points.length).toBeGreaterThan(0);
  });

  it("should respect offset in pagination", async () => {
    const page1 = await client.getPointsLeaderboard({ limit: 1, offset: 0 });
    const page2 = await client.getPointsLeaderboard({ limit: 1, offset: 1 });

    expect(page1.points[0].pubkey).not.toBe(page2.points[0].pubkey);
  });

  it("should fetch user points", async () => {
    const result = await client.getUserPoints(knownPubkey);

    expect(result).toBeDefined();
    expect(result.pubkey).toBe(knownPubkey);
    expect(typeof result.currentPoints).toBe("number");
    expect(typeof result.lifetimePoints).toBe("number");
    expect(typeof result.rank).toBe("number");
    expect(typeof result.projectedDailyPoints).toBe("number");
  });

  it("should fetch points history with pagination", async () => {
    const result = await client.getPointsHistory(knownPubkey, {
      limit: 2,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.pubkey).toBe(knownPubkey);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.limit).toBe(2);

    if (result.events.length > 0) {
      const event = result.events[0];
      expect(event.type).toBeTruthy();
      expect(typeof event.points).toBe("number");
      expect(event.day).toBeTruthy();
      expect(event.createdAt).toBeTruthy();
    }
  });

  it("should fetch points history with default params", async () => {
    const result = await client.getPointsHistory(knownPubkey);

    expect(result).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });
});
