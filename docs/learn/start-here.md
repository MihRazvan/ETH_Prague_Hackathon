# Start Here

Anyware is a cross-chain state verification stack for recent Ethereum state.

At a high level:

1. an offchain client fetches Ethereum proof data and packages it into a proof bundle
2. a destination-chain contract verifies that bundle against Ethereum consensus roots made available through EIP-4788
3. the destination application uses the verified slot value in its own logic

## What you ship with

Anyware has two installable pieces:

- `anyware-prover`
  Offchain TypeScript SDK for assembling proof bundles
- `anyware-solidity`
  Onchain Solidity verifier for checking those bundles

Most real integrations need both:

- backend, script, or frontend service layer uses the SDK
- destination-chain contract uses the Solidity verifier

## Current tested path

Today, the repo is tested around:

- source chain: Ethereum Sepolia
- destination chain: Base Sepolia

The same architecture applies more broadly to destination chains that expose Ethereum beacon roots through EIP-4788-compatible behavior, but the current demo and test surface is centered on Sepolia to Base Sepolia.

## Choose your path

- If you want to generate bundles offchain, start with the [SDK quickstart](./sdk/quickstart.md).
- If you want to integrate the verifier into a contract, start with the [Solidity quickstart](./solidity/quickstart.md).
- If you want the cryptographic walkthrough, read [How It Works](./concepts/how-it-works.md).

