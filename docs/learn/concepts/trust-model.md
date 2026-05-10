# Trust Model

Anyware does not remove trust from Ethereum itself. It removes extra offchain trust layers between source and destination.

## What Anyware trusts

- Ethereum consensus
- the destination chain's own EIP-4788 exposure of beacon roots
- the correctness of SSZ and MPT verification

## What Anyware avoids

Compared with bridge or oracle designs, Anyware does not require:

- a relayer to attest to source-chain state
- a multisig committee
- a DVN or oracle signer set
- an application-specific offchain service to decide what happened on Ethereum

## Important limitation

This repo is designed around recent Ethereum state.

That tradeoff keeps the stack much simpler than a general historical verification system, but it also means the sweet spot is:

- recent proofs
- high-trust actions
- lower-frequency verification flows

