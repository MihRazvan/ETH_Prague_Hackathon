# @elseware/prover

TypeScript SDK for assembling Elseware proof bundles for trustless recent Ethereum state verification on Ethereum-aligned destination chains that expose EIP-4788 beacon roots.

This package is the offchain half of Elseware:
- fetches `eth_getProof` account/storage proofs from the source chain
- finds the matching beacon block and builds the SSZ branch to `execution_payload_header`
- resolves the destination-chain timestamp needed for EIP-4788 lookup
- emits a proof bundle shaped for the Solidity verifier

## Install

```bash
pnpm add @elseware/prover viem
```

## Quickstart

```ts
import { ElsewareClient } from "@elseware/prover";

const client = new ElsewareClient({
  ethRpcUrl: process.env.ETH_RPC_URL!,
  beaconApiUrl: process.env.BEACON_API_URL!,
  destinationRpcUrl: process.env.BASE_RPC_URL!,
});

const bundle = await client.proveVaultLock({
  vault: "0xVaultAddress",
  borrower: "0xBorrowerAddress",
});

const envelope = client.toBundleEnvelope(bundle);
console.log(envelope.bundleVersion);
console.log(envelope.bundle.slotKey);
```

## Public API

### `new ElsewareClient(config)`

Creates the SDK client.

Config fields:
- `ethRpcUrl`
- `beaconApiUrl`
- `destinationRpcUrl`
- `searchWindowSlots?`
- `destinationSearchWindowBlocks?`

### `client.proveStorageSlot(args)`

Low-level proof assembly for a known storage slot.

### `client.proveMappingValue(args)`

Computes `keccak256(abi.encode(keyAddress, mappingSlot))` and proves that mapping entry for the target contract.

### `client.proveVaultLock(args)`

Opinionated helper for proving a `mapping(address => uint256)` lock record in a vault-style contract.

### `client.computeMappingSlot(address, mappingSlot?)`

Utility for mapping slot derivation.

### `client.preflight()`

Checks whether the configured source RPC, beacon API, and destination RPC are compatible enough to attempt proof generation.

### `client.toBundleEnvelope(bundle)`

Returns a versioned serialized envelope:

```ts
{
  bundleVersion: 1,
  bundle: { ...serialized fields... }
}
```

## CLI

After building or installing the package:

```bash
elseware-prover doctor
elseware-prover vault-slot --borrower 0x...
elseware-prover prove-slot --account 0x... --slot 0x...
elseware-prover prove-vault-lock --vault 0x... --borrower 0x...
```

JSON output:

```bash
elseware-prover doctor --json
```

## Error model

The SDK exports typed errors for the most common integration failures:

- `RpcRequestError`
- `RpcResponseShapeError`
- `BeaconApiRequestError`
- `BeaconResponseShapeError`
- `BeaconBlockNotFoundError`
- `DestinationAnchorNotFoundError`

These are useful when you want to distinguish retryable endpoint issues from deterministic payload/config issues.

## Current assumptions

- source chain supports historical `eth_getProof`
- destination chain exposes beacon roots through EIP-4788-compatible block data / precompile behavior
- beacon API exposes blinded blocks and headers for the relevant slot window

## Notes

- This package assembles evidence offchain; it does not verify truth on its own.
- The onchain verifier lives in the Solidity half of Elseware.
