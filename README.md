# flashnet-rewards-sdk

Minimal TypeScript library for the Flashnet rewards API with support for:

- rewards, points, and stats endpoints
- generating + signing endorsement YAML with a pluggable signer
- creating and deleting endorsements

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

```ts
import { RewardsClient, type Signer } from "flashnet-rewards-sdk";

const signer: Signer = {
  async sign(message: string) {
    // Replace with real signing logic.
    return `signed:${message}`;
  }
};

// baseUrl is optional (defaults to https://rewards.flashnet.xyz/v1)
const client = new RewardsClient();

// Rewards leaderboard
const rewards = await client.getRewardsLeaderboard({ limit: 10, offset: 0 });
console.log(rewards.leaderboards);

// POST /:user_pk/endorsements
const created = await client.endorseUser(
  "endorser_pk_here",
  "delegate_pk_here",
  5000,
  signer
);
console.log(created);

// DELETE /:user_pk/endorsements/:to_pubkey
await client.deleteEndorsement("endorser_pk_here", "delegate_pk_here", signer);
```

## Rewards API

- `getRewardsLeaderboard({ limit?, offset? })` -> `GET /rewards/`
- `getRewardsUserSummary(pubkey)` -> `GET /rewards/{pubkey}`

## Points API

- `getPointsLeaderboard({ limit?, offset? })` -> `GET /points/`
- `getUserPoints(pubkey)` -> `GET /points/{pubkey}`
- `getPointsHistory(pubkey, { limit?, offset? })` -> `GET /points/{pubkey}/history`

## Endorsement API

- `getEndorsements(pubkey)` -> `GET /rewards/{pubkey}/endorsements`
- `endorseUser(userPk, to, ratioBps, signer)` -> `POST /{user_pk}/endorsements`
- `deleteEndorsement(userPk, toPubkey, signer)` -> `DELETE /{user_pk}/endorsements/{to_pubkey}`

## Stats API

- `getHealth()` -> `GET /stats/health`

## Signer interface

```ts
interface Signer {
  sign(message: string): Promise<string> | string;
}
```
