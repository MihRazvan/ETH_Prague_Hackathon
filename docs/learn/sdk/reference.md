# SDK Reference

This page covers the public API exported by `anyware-prover`.

## `new AnywareClient(config)`

Creates an SDK client.

### Config

You can initialize the client either with:

- a named preset via `network`
- or explicit endpoint URLs

Supported preset today:

```ts
type NetworkPresetName = "sepolia-base-sepolia";
```

Relevant fields:

- `network?`
- `ethRpcUrl?`
- `beaconApiUrl?`
- `destinationRpcUrl?`
- `searchWindowSlots?`
- `destinationSearchWindowBlocks?`
- `beaconVersion?`

## `client.proveStorageSlot(args)`

Low-level proof assembly for a known storage slot.

```ts
const bundle = await client.proveStorageSlot({
  account: "0x...",
  slot: "0x...",
  blockNumber: 12345678n,
});
```

Arguments:

- `account`
- `slot`
- `blockNumber?`

Use this when you already know the slot key you want to prove.

## `client.proveMappingValue(args)`

Computes the mapping slot key and proves it.

```ts
const bundle = await client.proveMappingValue({
  account: "0xContract",
  keyAddress: "0xUser",
  mappingSlot: 0n,
});
```

Arguments:

- `account`
- `keyAddress`
- `mappingSlot?`
- `blockNumber?`

Internally, this computes:

```ts
keccak256(abi.encode(keyAddress, mappingSlot))
```

## `client.proveVaultLock(args)`

Opinionated helper for the vault demo pattern in this repo.

```ts
const bundle = await client.proveVaultLock({
  vault: "0xVault",
  borrower: "0xBorrower",
});
```

Arguments:

- `vault`
- `borrower`
- `mappingSlot?`
- `blockNumber?`

This is just a specialization of `proveMappingValue`.

## `client.computeMappingSlot(address, mappingSlot?)`

Utility for deriving a mapping slot key without generating a proof.

```ts
const slotKey = client.computeMappingSlot("0xUser", 0n);
```

Equivalent standalone export:

```ts
import { computeMappingSlot } from "anyware-prover";
```

## `client.preflight()`

Checks whether the configured endpoints appear compatible enough for proof generation.

Returns:

- source endpoint status
- beacon API status
- destination endpoint status, when configured
- `overallOk`

Use this before live demos and before running proof generation in production workflows.

## `client.serializeBundle(bundle)`

Converts a `ProofBundle` with `bigint` fields into a JSON-safe serialized shape.

## `client.toBundleEnvelope(bundle)`

Wraps the serialized bundle in a versioned envelope:

```ts
{
  bundleVersion: 1,
  bundle: { ... }
}
```

## `client.bundleVersion`

Returns the current bundle format version exported by the SDK.

## Exported types

The package also exports the main integrator-facing types:

- `AnywareClientConfig`
- `ProofBundle`
- `ExecutionPayloadHeader`
- `PreflightReport`
- `ProveStorageSlotArgs`
- `ProveMappingValueArgs`
- `ProveVaultLockArgs`
- `NetworkPresetName`

