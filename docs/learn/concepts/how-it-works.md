# How It Works

Anyware verifies recent Ethereum state on a destination chain in two cryptographic stages.

## Stage 1: anchor to Ethereum consensus

The destination chain reads Ethereum's beacon root through EIP-4788.

From that root, the proof reconstructs:

- the beacon header
- the beacon body root
- the execution payload header

This is done with SSZ Merkle proofs.

Once that succeeds, the destination contract has a verified Ethereum execution-layer `stateRoot`.

## Stage 2: walk Ethereum state

From the verified execution `stateRoot`, the proof walks:

1. the Ethereum account trie to reach the target account
2. the account's storage trie to reach the target slot

This is done with Merkle-Patricia trie proofs.

If both stages succeed, the destination contract now has a verified Ethereum storage-slot value.

## Result

The final output is:

- the slot value
- the source block number
- the account that was proven
- the slot key that was proven

That gives the destination application enough information to act on Ethereum truth onchain.

