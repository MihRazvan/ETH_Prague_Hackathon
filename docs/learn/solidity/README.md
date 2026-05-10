# Solidity

`anyware-solidity` is the onchain verifier package.

It verifies a proof bundle against:

1. the destination chain's EIP-4788 beacon root
2. the SSZ proof from beacon body to execution payload header
3. the Ethereum state trie account proof
4. the Ethereum storage trie proof

This is the part that actually decides truth onchain.

## Main surfaces

- `BeaconStateProof.sol`
- `IBeaconStateProof.sol`
- `VerifiedSlotConsumer.sol` as a reference consumer

## Pages

- [Quickstart](./quickstart.md)
- [Reference](./reference.md)
- [Consumer Pattern](./consumer-pattern.md)

