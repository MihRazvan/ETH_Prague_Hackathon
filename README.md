# Trustless State

Trustless cross-chain state verification for Ethereum-aligned rollups. This repo contains:

- `contracts/`: the on-chain verifier plus demo vault/lender contracts
- `prover/`: a TypeScript package that assembles proof bundles from public RPC + beacon APIs
- `webapp/`: a thin Next.js demo shell for the verifier playground and lending flow
- `docs/`: architecture and demo notes

## Current v1 shape

This first build focuses on the contract architecture and the prover boundary. The verifier contract is fully structured around:

1. EIP-4788 beacon-root lookup
2. SSZ verification of the beacon header
3. SSZ verification of the execution payload header root against the beacon body root
4. Ethereum state-trie account proof verification
5. Ethereum storage-trie slot proof verification
6. A freshness check based on source block timestamp

The lending demo uses a single packed storage slot per borrower so both the active lock and released lock states are provable with inclusion proofs.

## What is working today

- Solidity contracts compile and the Foundry test suite passes.
- The prover builds and can locate the matching blinded beacon block for a live Sepolia execution block, then generate the SSZ sibling path for `execution_payload_header`.
- The prover can now assemble a full live Sepolia storage proof bundle and resolve the matching Base Sepolia EIP-4788 timestamp for on-chain verification.
- The native demo flow has successfully borrowed against the real Base Sepolia lender using a proof sourced from Sepolia vault state.
- The webapp builds as a static Next.js shell for the verifier and lending demo.

## Honest current limitation

The live path is still RPC-sensitive. Historical `eth_getProof` support varies across Sepolia providers, and Base Sepolia public RPCs can intermittently return `502` during repeated block lookups. The prover now retries transient failures and uses a timestamp-guided destination scan, but for demos you should still prefer reliable RPC endpoints.

## Quick start

```bash
cd contracts
forge build

cd ../prover
pnpm install
pnpm build

cd ../webapp
pnpm install
pnpm dev
```

## Live proof commands

Compute the Sepolia vault slot for a borrower:

```bash
pnpm --filter @trustless-state/prover cli vault-slot \
  --borrower 0xYourBorrowerAddress
```

Generate a live proof bundle:

```bash
pnpm --filter @trustless-state/prover cli prove-slot \
  --account 0xVaultAddress \
  --slot 0xYourComputedSlotKey \
  --block-number 10821452 \
  --out tmp/bundle.json
```

Run the scripted lock-and-borrow flow after deployment:

```bash
pnpm --filter @trustless-state/prover live-demo
```

The live scripts read defaults from [.env.example](/Users/razvan/Repos/ETH_Prague_Hackathon/.env.example).

For live historical Sepolia proofs, `ETH_RPC_URL=https://sepolia.gateway.tenderly.co` is a safer default than many public endpoints.

## What I Need From You

To finish the real Sepolia/Base run, I need one of these:

1. A funded demo `PRIVATE_KEY` in your shell env so I can deploy and execute the flow here.
2. Existing deployed addresses for `Vault`, `BeaconStateProof`, and `Lender` if you already have them on Sepolia/Base Sepolia.

Optional but helpful:

- Your preferred Sepolia RPC and Base Sepolia RPC if you do not want to use the public defaults.
- A specific demo wallet address if you want the vault slot and proof bundle prepared for that account.

## Repo map

```text
contracts/src/BeaconStateProof.sol  Main verifier contract
contracts/src/lib/                  EIP-4788, SSZ, RLP, MPT helpers
contracts/src/demo/                 Vault, lender, mock USDC
prover/src/                         Proof-bundle assembly package
webapp/pages/                       Playground and lending demo shells
docs/                               Architecture and demo notes
```
