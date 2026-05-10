# SDK

`anyware-prover` is the offchain half of Anyware.

It does not decide truth on its own. Its job is to gather and package the evidence that the Solidity verifier will later check onchain.

Concretely, the SDK:

- fetches `eth_getProof` account and storage proofs from Ethereum
- finds matching beacon data from a public beacon API
- builds the SSZ inclusion branch to the execution payload header
- resolves the destination-side beacon-root lookup timestamp
- returns a proof bundle shaped for the Solidity verifier

## What the SDK is for

Use the SDK when you need to:

- prove a known storage slot
- prove a mapping value
- prove a vault-style `mapping(address => uint256)` lock record
- check whether your RPC and beacon endpoints are compatible before a live demo or integration

## Pages

- [Quickstart](./quickstart.md)
- [Reference](./reference.md)
- [Errors and Debugging](./errors-and-debugging.md)

