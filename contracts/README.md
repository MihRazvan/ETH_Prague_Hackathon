# @elseware/solidity

Solidity verifier contracts for Elseware trustless recent Ethereum state verification on EIP-4788 destination chains.

Main public surfaces:

- `src/BeaconStateProof.sol`
- `src/interfaces/IBeaconStateProof.sol`

Typical consumer flow:

1. receive a `ProofBundle`
2. call `verifyStorageSlot(proof, maxAge)`
3. validate `sourceAccount` and `sourceSlot`
4. use `verifiedValue` in your app logic

See `src/examples/VerifiedSlotConsumer.sol` for a minimal consumer contract.
