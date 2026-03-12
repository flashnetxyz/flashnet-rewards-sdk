import { describe, it, expect, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { keygen, getPublicKey, signAsync } from "@noble/secp256k1";
import { RewardsClient, type Signer } from "../../src/index.js";

function getCompressedPublicKey(privateKey: Uint8Array): string {
  const pubBytes = getPublicKey(privateKey, true);
  return Buffer.from(pubBytes).toString("hex");
}

function createSecp256k1Signer(privateKey: Uint8Array): Signer {
  return {
    async sign(yamlMessage: string): Promise<string> {
      const digest = createHash("sha256")
        .update(yamlMessage, "utf-8")
        .digest();
      const sig = await signAsync(digest, privateKey, { prehash: false });
      return Buffer.from(sig).toString("hex");
    },
  };
}

const { secretKey: endorserPrivKey } = keygen();
const endorserPk = getCompressedPublicKey(endorserPrivKey);
const endorserSigner = createSecp256k1Signer(endorserPrivKey);

const { secretKey: delegatePrivKey } = keygen();
const delegatePk = getCompressedPublicKey(delegatePrivKey);

const { secretKey: delegatePrivKey2 } = keygen();
const delegatePk2 = getCompressedPublicKey(delegatePrivKey2);

const client = new RewardsClient();

const createdEndorsements: string[] = [];

afterAll(async () => {
  for (const toPk of createdEndorsements) {
    try {
      await client.deleteEndorsement(endorserPk, toPk, endorserSigner);
    } catch {
      // best-effort cleanup
    }
  }
});

describe("Endorsement API", () => {
  it("should create an endorsement", async () => {
    const result = await client.endorseUser(
      endorserPk,
      delegatePk,
      5000,
      endorserSigner,
    );
    createdEndorsements.push(delegatePk);

    expect(result).toBeDefined();
    expect(result.endorser).toBe(endorserPk);
    expect(result.to).toBe(delegatePk);
    expect(result.ratioBps).toBe(5000);
    expect(result.timestampNonce).toBeTruthy();
    expect(result.signature).toBeTruthy();
  });

  it("should retrieve endorsements for the user", async () => {
    const result = await client.getEndorsements(endorserPk);

    expect(result).toBeDefined();
    expect(result.endorser).toBe(endorserPk);
    expect(Array.isArray(result.endorsements)).toBe(true);

    const entry = result.endorsements.find((e) => e.to === delegatePk);
    expect(entry).toBeDefined();
    expect(entry!.ratioBps).toBe(5000);
  });

  it("should create a second endorsement to a different delegate", async () => {
    const result = await client.endorseUser(
      endorserPk,
      delegatePk2,
      3000,
      endorserSigner,
    );
    createdEndorsements.push(delegatePk2);

    expect(result.to).toBe(delegatePk2);
    expect(result.ratioBps).toBe(3000);
  });

  it("should list both endorsements", async () => {
    const result = await client.getEndorsements(endorserPk);

    const tos = result.endorsements.map((e) => e.to);
    expect(tos).toContain(delegatePk);
    expect(tos).toContain(delegatePk2);
  });

  it("should update an existing endorsement with a new ratioBps", async () => {
    const result = await client.endorseUser(
      endorserPk,
      delegatePk,
      2500,
      endorserSigner,
    );

    expect(result.ratioBps).toBe(2500);

    const list = await client.getEndorsements(endorserPk);
    const entry = list.endorsements.find((e) => e.to === delegatePk);
    expect(entry).toBeDefined();
    expect(entry!.ratioBps).toBe(2500);
  });

  it("should delete the first endorsement", async () => {
    const result = await client.deleteEndorsement(
      endorserPk,
      delegatePk,
      endorserSigner,
    );
    createdEndorsements.splice(createdEndorsements.indexOf(delegatePk), 1);

    expect(result).toBeDefined();
  });

  it("should no longer list the deleted endorsement", async () => {
    const result = await client.getEndorsements(endorserPk);
    const tos = result.endorsements.map((e) => e.to);
    expect(tos).not.toContain(delegatePk);
    expect(tos).toContain(delegatePk2);
  });

  it("should delete the second endorsement", async () => {
    await client.deleteEndorsement(
      endorserPk,
      delegatePk2,
      endorserSigner,
    );
    createdEndorsements.splice(createdEndorsements.indexOf(delegatePk2), 1);
  });

  it("should have no endorsements remaining", async () => {
    const result = await client.getEndorsements(endorserPk);
    expect(result.endorsements).toHaveLength(0);
  });
});
