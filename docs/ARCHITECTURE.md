# Architecture

## Flow

1. A borrower locks ETH in `Vault` on Ethereum Sepolia.
2. The prover fetches:
   - `eth_getProof` account + storage proofs from an Ethereum RPC
   - a blinded beacon block from a public beacon API
   - the matching execution payload header for the source execution block
3. The prover assembles a `ProofBundle` shaped to match the Solidity verifier interface.
4. `BeaconStateProof` on Base Sepolia verifies:
   - the EIP-4788 anchor root
   - the beacon header SSZ root
   - the execution payload header branch into `body_root`
   - the Ethereum account trie proof
   - the Ethereum storage trie proof
5. `Lender` mints demo USDC against the verified lock.

## Current implementation notes

- The verifier contract is fully wired for the five-step flow.
- The TypeScript prover already handles the RPC side and beacon-block discovery.
- The SSZ proof generator now derives the real `execution_payload_header` branch from live blinded beacon block JSON through Lodestar + persistent-merkle-tree.
- The freshness check is timestamp-based in this first build, which keeps the on-chain logic simple and avoids pretending we already have an authenticated "current L1 block number" source on the destination chain.
- The lending demo intentionally uses a packed slot with `status` in the low byte so the released state is provable with an inclusion proof instead of a non-existence proof.

## Contracts

- `BeaconStateProof.sol`: main verifier
- `demo/Vault.sol`: source-chain lock contract
- `demo/Lender.sol`: destination-chain borrower flow
- `demo/MockUSDC.sol`: demo stablecoin minted by `Lender`

## Prover modules

- `eth-getProof.ts`: Ethereum JSON-RPC client
- `beacon-fetch.ts`: beacon header + blinded-block discovery
- `ssz-prove.ts`: execution payload branch builder
- `bundle.ts`: final calldata assembly
