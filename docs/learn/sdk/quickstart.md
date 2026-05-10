# SDK Quickstart

This is the shortest path for generating an Anyware proof bundle with `anyware-prover`.

## Install

```bash
pnpm add anyware-prover viem
```

## Create a client

```ts
import { AnywareClient } from "anyware-prover";

const client = new AnywareClient({
  network: "sepolia-base-sepolia",
});
```

You can also pass explicit endpoints instead of a named preset:

```ts
const client = new AnywareClient({
  ethRpcUrl: process.env.ETH_RPC_URL!,
  beaconApiUrl: process.env.BEACON_API_URL!,
  destinationRpcUrl: process.env.BASE_RPC_URL!,
});
```

## Check your endpoints

Before generating live proofs, run a preflight check:

```ts
const report = await client.preflight();

if (!report.overallOk) {
  throw new Error("Anyware endpoints are not ready.");
}
```

CLI equivalent:

```bash
anyware-prover doctor --network sepolia-base-sepolia
```

## Prove a vault lock

The simplest happy path in this repo is a vault lock stored as `mapping(address => uint256)`.

```ts
const bundle = await client.proveVaultLock({
  vault: "0xVaultAddress",
  borrower: "0xBorrowerAddress",
});
```

You can then serialize it for transport:

```ts
const envelope = client.toBundleEnvelope(bundle);
console.log(envelope.bundleVersion);
console.log(envelope.bundle.slotKey);
```

## Prove a known storage slot

If you already know the exact slot key:

```ts
const bundle = await client.proveStorageSlot({
  account: "0xTargetContract",
  slot: "0xKnownStorageSlot",
});
```

## Prove a mapping value

If you know the mapping slot index and the key address:

```ts
const bundle = await client.proveMappingValue({
  account: "0xTargetContract",
  keyAddress: "0xUser",
  mappingSlot: 0n,
});
```

## What you get back

The SDK returns a `ProofBundle` that includes:

- beacon header fields
- execution payload header fields
- SSZ proof from beacon body to execution payload header
- account proof
- storage proof

That bundle is ready to hand to the Solidity verifier on the destination chain.

## Next step

Once you can generate a bundle, move to the [Solidity quickstart](../solidity/quickstart.md) to verify it onchain.

