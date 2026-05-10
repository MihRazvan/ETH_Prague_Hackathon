# Solidity Reference

This page covers the main onchain verifier surface exported by `anyware-solidity`.

## `IBeaconStateProof.ExecutionPayloadHeader`

Represents the verified Ethereum execution payload header that is proven under the beacon body root.

Key fields include:

- `stateRoot`
- `blockNumber`
- `timestamp`
- `blockHash`

This is the source of the execution-layer state root used for the trie proofs.

## `IBeaconStateProof.ProofBundle`

This is the bundle your destination-chain contract receives.

It contains:

- beacon header fields:
  - `timestamp`
  - `slot`
  - `proposerIndex`
  - `parentRoot`
  - `stateRoot`
  - `bodyRoot`
- execution payload proof data:
  - `executionPayloadGIndex`
  - `executionHeader`
  - `executionHeaderProof`
- trie proof data:
  - `account`
  - `slotKey`
  - `accountProof`
  - `storageProof`

## `verifyStorageSlot(ProofBundle proof, uint256 maxAge)`

Main verifier entrypoint.

Signature:

```solidity
function verifyStorageSlot(ProofBundle calldata proof, uint256 maxAge)
    external
    view
    returns (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot);
```

### Behavior

This function:

1. checks freshness against `maxAge`
2. reads the destination chain's beacon root through EIP-4788
3. verifies the beacon header root
4. verifies the execution payload header SSZ branch
5. verifies the Ethereum account trie proof
6. verifies the Ethereum storage trie proof
7. returns the proven slot value and provenance data

### Reverts

The verifier uses custom errors:

- `InvalidBeaconHeaderRoot`
- `InvalidExecutionPayloadProof`
- `InvalidAccountProof`
- `InvalidStorageValue`
- `InvalidAccountRlp`
- `StaleProof`

These are the main contract-level failure classes integrators should expect when a bundle is malformed, stale, or mismatched.

## `BeaconStateProof(address beaconRoots_)`

Constructor for the verifier.

If `beaconRoots_` is zero, the verifier falls back to the standard EIP-4788 beacon roots address from the bundled library.

