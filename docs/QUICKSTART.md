# Anyware Quickstart

This is the shortest path for an integrator who wants to prove one recent Ethereum storage slot and verify it on an EIP-4788 destination chain.

## 1. Install the SDK

```bash
pnpm add anyware-prover viem
```

## 2. Check your endpoints

```bash
pnpm --filter anyware-prover cli doctor \
  --network sepolia-base-sepolia
```

If `overall: ready`, your source RPC, beacon API, and destination RPC are good enough for proof generation.

## 3. Generate a proof bundle

Known slot:

```bash
pnpm --filter anyware-prover cli prove-slot \
  --account 0xVaultAddress \
  --slot 0xStorageSlotKey \
  --eth-rpc "$ETH_RPC_URL" \
  --beacon-api "$BEACON_API_URL" \
  --destination-rpc "$BASE_RPC_URL"
```

Vault-style mapping entry:

```bash
pnpm --filter anyware-prover cli prove-vault-lock \
  --vault 0xVaultAddress \
  --borrower 0xBorrowerAddress \
  --network sepolia-base-sepolia
```

Both commands output a versioned bundle envelope.

## 4. Verify onchain

Your destination-chain contract calls:

```solidity
verifyStorageSlot(proof, maxAge)
```

using the raw `ProofBundle` fields inside the serialized envelope.

The verifier returns:
- `verifiedValue`
- `sourceBlockNumber`
- `sourceAccount`
- `sourceSlot`

Your app logic then decides what to do with that proven fact.

## 5. Consumer pattern

Typical flow:

1. offchain app generates bundle with `anyware-prover`
2. offchain app submits bundle to destination contract
3. destination contract calls `BeaconStateProof.verifyStorageSlot`
4. consumer contract checks `sourceAccount` and `sourceSlot`
5. consumer contract uses `verifiedValue`

## Common failure classes

- `RpcRequestError`
  Source or destination endpoint is down / timing out / returning 5xx.
- `RpcResponseShapeError`
  Endpoint responded, but not in the format Anyware expects.
- `BeaconApiRequestError`
  Beacon API request failed.
- `BeaconResponseShapeError`
  Beacon API payload shape is malformed or incompatible.
- `BeaconBlockNotFoundError`
  Matching beacon block could not be found within the configured slot search window.
- `DestinationAnchorNotFoundError`
  Destination chain could not find the target beacon root near the expected timestamp.
