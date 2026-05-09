# Cross-Chain State Verification Library — Project Brief

> **For the AI Agent reading this**: You have zero prior context. This document is your full briefing. Read it end-to-end before writing any code. It contains the problem, the architecture, the technical approach, every external reference you'll need, the build plan, and the demo scope. By the end, you should be able to start building without further clarification.

---

## TL;DR

We are building a **Solidity library + TypeScript prover + minimal demo dApp** that lets a smart contract on an EVM rollup (e.g. Base) verify Ethereum L1 state directly — with no relayer, no bridge, no oracle, no off-chain service running anywhere.

The verification anchor is **EIP-4788** (the beacon block root precompile that's already part of every Ethereum-aligned rollup). On top of that, we walk **SSZ Merkle proofs** to extract Ethereum's execution state root, then walk **Merkle Patricia Trie (MPT) proofs** to extract a specific storage slot value.

The demo: a user locks ETH in a vault contract on Ethereum Sepolia, then borrows USDC against it on Base Sepolia — proving the lock cryptographically with no relayer in between.

This is for the **ETHPrague hackathon, Ethereum Core track**.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Why This Matters Now (the Kelp Hack)](#why-this-matters-now)
3. [Existing Solutions and Their Trade-offs](#existing-solutions)
4. [Our Approach](#our-approach)
5. [How It's Different From Herodotus](#how-its-different-from-herodotus)
6. [Technical Architecture](#technical-architecture)
7. [The Five-Step Verification Chain](#the-five-step-verification-chain)
8. [What We're Actually Building (Artifacts)](#what-were-actually-building)
9. [Repository Structure](#repository-structure)
10. [Build Plan (Hour-by-Hour)](#build-plan)
11. [Critical External References](#critical-external-references)
12. [Existing Code to Adapt](#existing-code-to-adapt)
13. [Known Risks and Mitigations](#known-risks-and-mitigations)
14. [Scope Discipline — What to Cut](#scope-discipline)
15. [Demo Plan](#demo-plan)
16. [The Pitch](#the-pitch)

---

## The Problem

Smart contracts can only access data on their own chain. A contract on Base cannot natively read storage from Ethereum. A contract on Arbitrum cannot verify that a transaction was included on Optimism. Each chain maintains its own state, and there is no native mechanism for one chain's contracts to verify another chain's data.

Yet cross-chain data access is essential for many DeFi applications:
- Lending protocols that need to verify collateral on a different chain
- Governance systems that need to check token holdings across networks
- Proof-of-reserves attestations
- Cross-chain credit, identity, compliance

Today, all of these rely on **trust-based bridges** — relayers, multisigs, DVNs (Decentralized Verifier Networks), or oracle committees. The destination chain trusts that some off-chain operator reported the source chain's state honestly. **This is the trust assumption that has cost the industry billions in bridge hacks.**

## Why This Matters Now

On **April 18, 2026**, attackers (linked to North Korea's Lazarus Group) stole **~$292 million from KelpDAO's LayerZero bridge**. The attack was not against a smart contract — every on-chain transaction looked valid. The attackers compromised the off-chain RPC nodes feeding LayerZero's DVN, tricking it into signing an attestation for a fake "burn" event on the source chain. The destination contract released funds based on this phantom attestation.

KelpDAO was using a **1-of-1 DVN setup** — a single off-chain validator was the sole witness. Roughly 47% of LayerZero apps used the same setup. The hack made the underlying problem urgent: **trust-based cross-chain verification is fundamentally fragile**.

This is the problem our library replaces with cryptographic verification.

## Existing Solutions

Three categories exist today:

1. **Bridges & Relayers** (LayerZero, Wormhole, Axelar): A relayer or validator committee attests to source-chain events. Trust = honesty of operators. **Failure mode**: operators compromised → fake attestations accepted (Kelp).

2. **Oracles** (Chainlink CCIP): A signed network attestation. Trust = honesty of signers. Better than 1-of-1 DVN but still not cryptographic.

3. **Cryptographic State Verification** (Herodotus, Axiom, Lagrange, Brevis): Use Merkle proofs + ZK to verify source-chain state directly. **No trust assumption beyond math.** This is the right model. Almost nobody has built consumer-facing applications on top of these primitives.

### The Closest Existing Project: Herodotus

**Herodotus** is the most mature cryptographic state verification platform. They provide a managed service with:
- A REST API for requesting storage proofs
- An off-chain database of indexed Ethereum block headers
- A Historical Block Hash Accumulator (Merkle Mountain Range) committed on-chain via STARK proofs
- Satellite verifier contracts deployed on multiple destination chains

**Their docs**: https://docs.herodotus.cloud/storage-proofs-api/introduction
**Their cross-chain lending pitch (literally describes our use case)**: https://www.herodotus.cloud/en/learn/cross-chain-state-verification
**Example repo**: https://github.com/HerodotusDev/yab-herodotus

Herodotus is excellent. They've solved the general case. **We are NOT trying to compete with or replicate Herodotus.**

## Our Approach

We're building a **narrower, fundamentally different point in the design space**:

> **A trustless cross-chain state verification primitive that runs zero off-chain infrastructure.**

The key insight: **EIP-4788** exposes Ethereum's beacon block root inside every modern EVM rollup, written by the rollup's own protocol layer every block. This means a rollup contract can read Ethereum's consensus root directly — no oracle, no service, no managed accumulator needed.

By anchoring to EIP-4788 and walking SSZ + MPT proofs, we get:
- **No off-chain service** (Herodotus runs a database + prover; we run nothing)
- **No API key** (Herodotus requires registration; ours is `npm install`)
- **No liveness dependency** (if Herodotus's infra dies, every consumer breaks; we use public RPCs that have many independent operators)
- **Truly permissionless** (anyone can fork the library, deploy their own instance, audit the math)

The cost: we only handle **recent state** (~27 hours via beacon roots, or ~18 months with `historical_summaries`). For deep historical proofs, Herodotus is the right tool. For the 95% of cross-chain reads that operate on recent state, our library is sufficient and dramatically simpler.

## How It's Different From Herodotus

| | Herodotus | Our Library |
|---|---|---|
| Trust model | Cryptographic (STARK proof of accumulator) | Cryptographic (EIP-4788 + SSZ + MPT) |
| Off-chain infrastructure | Managed service | None (public RPCs/beacon nodes) |
| Liveness dependency | Their service | None |
| Historical depth | Genesis to head | ~27 hours (or ~18 months with extension) |
| Source chains | Ethereum, Starknet, OP, Base, ApeChain | Ethereum only |
| Destination chains | Many | Any chain with EIP-4788 |
| Integration | REST API + Satellite contract | Solidity import + npm package |
| Cost model | Service batches and bills | User pays own gas |
| Permissionless | No (API key) | Yes |

**Crucial honesty**: Both are cryptographically trustless for *safety*. The difference is *liveness* and *deployment surface*, not absolute trustlessness. **Do not overclaim** — Herodotus's STARK proofs are genuinely trustless; we just eliminate even the soft liveness dependency by using a different mechanism (EIP-4788) intrinsic to the destination chain.

The honest pitch: *"Herodotus is production infrastructure for arbitrary cross-chain queries. We're the minimal, service-free primitive for the case where you only need recent state and want zero off-chain dependencies. Different trade-off, different sweet spot."*

## Technical Architecture

### Source Chain (Ethereum Sepolia)
- **Vault contract** (~100 lines Solidity)
  - `lock()`: accepts ETH, writes `(user, amount, nonce)` to known storage slot, emits event
  - `unlock(nonce)`: releases ETH, clears slot
  - That's it. No liquidation logic, no oracle dependency, no health factor. The slot value is the source of truth.

### Destination Chain (Base Sepolia)
- **Verification library** (`BeaconStateProof`) — the core artifact (~500-800 lines)
- **Lender contract** (~200 lines)
  - `borrow(ProofBundle proof)`: calls library, validates proof references vault contract, mints debt tokens at conservative LTV (e.g. 50%)
  - `repay(uint256 debtId)`: burns debt tokens, marks loan repaid
  - `settle(ProofBundle proof, uint256 debtId)`: verifies fresh proof showing vault no longer holds the lock, clears loan record

### Off-Chain (User's Browser/CLI)
- **TypeScript prover package** (~500 lines)
  - Calls `eth_getProof` on public Ethereum RPC → account proof + storage proof
  - Calls public beacon node API → beacon header + SSZ proof of execution payload
  - Bundles everything into the calldata format the verifier expects
  - Returns ready-to-submit `bytes` blob

### What's NOT in the architecture
- No relayer
- No service running anywhere
- No API key
- No accumulator we maintain
- No bridge contract
- No DVN, no oracle, no signer set
- No multi-chain deployment of a single coordinated contract

## The Five-Step Verification Chain

This is what the library does internally when called. Each step verifies a cryptographic relationship.

### Setup: The User's ProofBundle (assembled off-chain)
The user provides:
1. Beacon header object (slot, proposer_index, parent_root, state_root, body_root)
2. Execution payload header object (parent_hash, state_root, block_hash, block_number, etc.)
3. SSZ Merkle proof linking execution payload header → beacon body root
4. Account proof (MPT trie nodes) for the vault contract
5. Storage proof (MPT trie nodes) for the locked-amount slot
6. The block timestamp used for EIP-4788 lookup

### Step 1 — EIP-4788 Lookup
- Read beacon block root from precompile at `0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02`
- Pass the timestamp; receive the 32-byte beacon root
- This is the trust anchor — written by the rollup's own protocol layer, not by us
- **Reference**: https://eips.ethereum.org/EIPS/eip-4788

### Step 2 — Beacon Header SSZ Verification
- The user provided the actual beacon header object (5 fields)
- Compute SSZ `hashTreeRoot()` over those fields per SSZ rules
- Compare to beacon root from step 1
- **If matches**: the header is genuine. We can now read individual fields, including `body_root`.

SSZ for a fixed-container like the beacon header:
- Each field is hashed individually (or treated as a 32-byte chunk)
- Pairs of chunks are hashed together up the tree
- The final 32-byte hash is the root

### Step 3 — Execution Payload Header SSZ Proof
- We have `body_root` from step 2
- The execution payload header is at a known position (generalized index) inside the beacon body
- User provides:
  - The execution payload header object
  - A small list of sibling hashes forming the Merkle path from the header's leaf position to `body_root`
- Library hashes the payload header per SSZ rules → leaf
- Walks up the tree using the provided siblings → reconstructed root
- Compares to `body_root`
- **If matches**: we now have verified `state_root` and `block_hash` from Ethereum's execution layer

The generalized index for the execution payload header inside the beacon body depends on the Ethereum hard fork. For post-Deneb, it's a known constant. Get the current value from the consensus specs.

### Step 4 — Account Proof (MPT Walk #1)
- We have Ethereum's `state_root` from step 3
- The state trie is a Merkle Patricia Trie mapping `keccak256(address) → account data`
- Account data RLP-encoded: `[nonce, balance, storage_root, code_hash]`
- User provided account proof: list of trie nodes forming the path from `state_root` down to the vault account
- Library walks the trie:
  - Start at `state_root`
  - For each node, follow the path determined by `keccak256(vault_address)`
  - Verify each node hashes correctly
  - End at the vault's account data
- Extract `storage_root` from the account data

### Step 5 — Storage Proof (MPT Walk #2)
- We have the vault's `storage_root` from step 4
- The vault's storage trie maps `keccak256(slot_key) → slot_value`
- For a `mapping(address => uint256) public locks`, the slot key is `keccak256(user_address, slot_index_of_mapping)`
- User provided storage proof: list of trie nodes forming the path from `storage_root` down to the slot
- Walk the trie identically to step 4
- Extract the slot value (e.g., 1 ETH locked)

### Step 6 — Freshness Check
- Read the *current* beacon root via EIP-4788 with the current `block.timestamp`
- Derive the current Ethereum block number (this is a soft estimate; we can also accept the current block from the user and verify it independently)
- Reject if `currentBlock - provenBlock > maxBlockAge` (e.g., 50 blocks)
- **Why this matters**: prevents stale-proof attacks where a user proves a lock, withdraws on Ethereum, then submits the old proof to borrow against collateral they no longer have

### Output
Library returns: `(verifiedSlotValue, sourceBlockNumber, sourceAccount, sourceSlot)`

The lender contract validates `sourceAccount == known_vault_address` and uses `verifiedSlotValue` as the locked collateral amount.

## What We're Actually Building

### Artifact 1: `BeaconStateProof.sol` — The Core Library
The infrastructure-grade Solidity library. Public surface:

```solidity
struct ProofBundle {
    // Step 1: timestamp for EIP-4788 lookup
    uint64 timestamp;

    // Step 2: beacon header fields
    uint64 slot;
    uint64 proposerIndex;
    bytes32 parentRoot;
    bytes32 stateRoot;        // beacon state root (NOT execution)
    bytes32 bodyRoot;

    // Step 3: execution payload header + SSZ proof
    ExecutionPayloadHeader executionHeader;
    bytes32[] executionHeaderProof; // SSZ Merkle path to bodyRoot

    // Step 4 & 5: MPT proofs
    address account;          // vault contract address
    bytes32 slot;             // storage slot key
    bytes[] accountProof;     // RLP-encoded trie nodes
    bytes[] storageProof;     // RLP-encoded trie nodes
}

struct ExecutionPayloadHeader {
    bytes32 parentHash;
    address feeRecipient;
    bytes32 stateRoot;        // execution state root (THIS is what we want)
    bytes32 receiptsRoot;
    bytes logsBloom;          // 256 bytes
    bytes32 prevRandao;
    uint64 blockNumber;
    uint64 gasLimit;
    uint64 gasUsed;
    uint64 timestamp;
    bytes extraData;
    uint256 baseFeePerGas;
    bytes32 blockHash;
    bytes32 transactionsRoot;
    bytes32 withdrawalsRoot;
    uint64 blobGasUsed;
    uint64 excessBlobGas;
}

function verifyStorageSlot(
    ProofBundle calldata proof,
    uint256 maxBlockAge
) external view returns (
    bytes32 verifiedValue,
    uint64 sourceBlockNumber,
    address sourceAccount,
    bytes32 sourceSlot
);
```

Internal modules:
- `EIP4788.sol` — reads beacon root from precompile
- `SSZ.sol` — SSZ hashing + Merkle proof verification
- `MPT.sol` — Merkle Patricia Trie verification (RLP decoding + path walking)
- `BeaconStateProof.sol` — orchestrates the five-step chain

### Artifact 2: TypeScript Prover Package (`@trustless-state/prover`)
npm-installable package. Public API:

```typescript
import { Prover } from '@trustless-state/prover';

const prover = new Prover({
  ethRpcUrl: 'https://ethereum-sepolia.publicnode.com',
  beaconApiUrl: 'https://ethereum-sepolia-beacon-api.publicnode.com',
});

const bundle = await prover.proveStorageSlot({
  account: '0xVaultContractAddress',
  slot: '0x...',  // storage slot key
  blockNumber: 12345678,  // optional, defaults to recent
});

// bundle is the ProofBundle struct ready to submit as calldata
```

Internal modules:
- `eth-getProof.ts` — calls Ethereum RPC, parses MPT proofs
- `beacon-fetch.ts` — calls beacon API, fetches headers
- `ssz-prove.ts` — computes SSZ Merkle proofs for execution payload header
- `bundle.ts` — assembles everything into ProofBundle calldata

### Artifact 3: Demo Smart Contracts
- `Vault.sol` (Sepolia) — minimal lock/unlock contract
- `Lender.sol` (Base Sepolia) — imports `BeaconStateProof`, issues loans against verified locks

### Artifact 4: Two Demo UIs (Next.js, ugly-but-functional)
- **Verifier Playground**: enter any address + slot + block number, watch the proof verify on-chain step by step
- **Lending Demo**: lock → borrow → repay → settle full flow

## Repository Structure

```
trustless-state/
├── README.md                       # Public-facing overview
├── PROJECT_BRIEF.md                # This document
├── contracts/
│   ├── foundry.toml
│   ├── src/
│   │   ├── BeaconStateProof.sol    # Main library (orchestrator)
│   │   ├── lib/
│   │   │   ├── EIP4788.sol         # Beacon root reader
│   │   │   ├── SSZ.sol             # SSZ hashing + Merkle verify
│   │   │   ├── MPT.sol             # Merkle Patricia Trie verify
│   │   │   └── RLP.sol             # RLP decoder (used by MPT)
│   │   ├── demo/
│   │   │   ├── Vault.sol           # Source-chain vault
│   │   │   └── Lender.sol          # Destination-chain lender
│   │   └── interfaces/
│   │       └── IBeaconStateProof.sol
│   ├── test/
│   │   ├── BeaconStateProof.t.sol  # Unit tests with fixtures
│   │   ├── SSZ.t.sol
│   │   ├── MPT.t.sol
│   │   └── fixtures/                # Real Sepolia proof fixtures
│   └── script/
│       ├── DeployVault.s.sol
│       └── DeployLender.s.sol
├── prover/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                # Public Prover class
│   │   ├── eth-getProof.ts
│   │   ├── beacon-fetch.ts
│   │   ├── ssz-prove.ts
│   │   ├── bundle.ts
│   │   └── types.ts
│   └── test/
│       └── prover.test.ts
├── webapp/
│   ├── package.json
│   ├── pages/
│   │   ├── playground.tsx          # Verifier playground
│   │   └── lending.tsx             # Lending demo
│   └── components/
│       ├── ProofVisualizer.tsx     # Shows verification steps
│       └── ChainStatus.tsx
└── docs/
    ├── ARCHITECTURE.md
    ├── DEMO_SCRIPT.md
    └── REFERENCES.md
```

## Build Plan

Realistic 48-hour hackathon timeline. Adjust if team size is bigger.

### Hours 0–4: Setup
- Initialize monorepo (pnpm workspaces or just three sibling dirs)
- Foundry init in `contracts/`
- Get hello-world contracts deploying to Sepolia and Base Sepolia
- Verify EIP-4788 precompile reachable on Base Sepolia
- Set up RPC endpoints + beacon API endpoints, confirm they work
- Smoke test: deploy a contract on each chain, call from a script

### Hours 4–12: SSZ Library + EIP-4788
- Implement `EIP4788.sol` — read beacon root by timestamp
- Implement basic SSZ hashing for fixed containers (beacon header)
- Implement SSZ Merkle proof verification (sibling-path walk)
- Test against a real Sepolia beacon root: provide a known header, verify it hashes correctly
- **Critical milestone**: given a real beacon root + real beacon header, library returns true

### Hours 12–20: Execution Payload Header Proof
- Add SSZ logic for the execution payload header (more fields, dynamic-size for `extraData` and `logsBloom`)
- Compute the generalized index for execution payload inside beacon body
- Verify the Merkle path from execution header → body root
- **Critical milestone**: given a real beacon header + execution header + SSZ proof, library extracts verified `state_root` and `block_hash`

### Hours 20–28: MPT Verifier
- Adapt an existing Solidity MPT library (see references below)
- Implement RLP decoding (also from existing libraries)
- Wire up: state_root → account proof → storage_root → storage proof → slot value
- **Critical milestone**: end-to-end test — given a real ProofBundle for a known Sepolia storage slot, library returns the correct value

### Hours 28–34: Demo Contracts
- `Vault.sol` on Sepolia: simple ETH lock with `mapping(address => uint256) locks` (or with nonces if supporting multiple locks per user)
- `Lender.sol` on Base Sepolia: imports `BeaconStateProof`, single `borrow()` and `repay()` flow
- Deploy both, get addresses for the demo
- Manual end-to-end test: lock on Sepolia → assemble proof manually → borrow on Base

### Hours 34–40: TypeScript Prover
- Implement `eth-getProof.ts` — call Ethereum RPC, parse response
- Implement `beacon-fetch.ts` — call beacon API for headers
- Implement `ssz-prove.ts` — compute the SSZ proof for execution payload (use `@chainsafe/ssz` library)
- Bundle into ProofBundle struct format
- Test: prover output → contract call → success

### Hours 40–46: Demo UIs
- Set up Next.js app
- Playground page: address/slot/block inputs, "generate proof" + "verify" buttons, visible step-by-step output
- Lending page: connect wallet, three-step flow with status indicators
- Make it ugly but reliable

### Hours 46–48: Polish & Demo Prep
- Reproducibility: README with `pnpm install && pnpm demo` working end-to-end
- Record fallback video in case of live demo failures
- Write the pitch
- Test everything one more time

## Critical External References

### EIP-4788 (THE TRUST ANCHOR)
- Spec: https://eips.ethereum.org/EIPS/eip-4788
- Precompile address: `0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02`
- ABI: takes `bytes32` timestamp, returns `bytes32` beacon root
- Storage history: ~8191 slots (~27 hours)

### SSZ (Simple Serialize)
- Specification: https://github.com/ethereum/consensus-specs/blob/dev/ssz/simple-serialize.md
- Reference implementations: `@chainsafe/ssz` (TypeScript), `lighthouse` (Rust)
- Key concept: **generalized index** — every field has a known position in the Merkle tree

### Ethereum Consensus Specs
- Beacon block structure: https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md
- Deneb fork (current relevant fork): https://github.com/ethereum/consensus-specs/tree/dev/specs/deneb
- ExecutionPayloadHeader spec: in the deneb fork specs
- **Generalized index reference**: https://github.com/ethereum/consensus-specs/blob/dev/ssz/merkle-proofs.md

### Merkle Patricia Trie (MPT)
- Spec: https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/
- Includes node types (branch, extension, leaf) and hex-encoding rules

### Ethereum RPC: `eth_getProof`
- Spec (EIP-1186): https://eips.ethereum.org/EIPS/eip-1186
- Public RPC endpoints (use any):
  - `https://ethereum-sepolia.publicnode.com`
  - `https://rpc.sepolia.org`
  - `https://sepolia.gateway.tenderly.co`

### Beacon Node API
- Spec: https://ethereum.github.io/beacon-APIs/
- Key endpoints:
  - `GET /eth/v1/beacon/headers/{block_id}` — beacon header
  - `GET /eth/v2/beacon/blocks/{block_id}` — full beacon block (includes body)
- Public beacon endpoints:
  - `https://ethereum-sepolia-beacon-api.publicnode.com`
  - `https://sepolia.beaconcha.in/api/v1/`

### Herodotus (the project NOT to copy)
- Docs: https://docs.herodotus.cloud/storage-proofs-api/introduction
- Cross-chain state explainer: https://www.herodotus.cloud/en/learn/cross-chain-state-verification
- Yet Another Bridge example (architecturally similar to our flow): https://github.com/kaizokulabs/yet-another-bridge
- Tutorial: https://github.com/HerodotusDev/yab-herodotus

### The Kelp Hack (the narrative)
- Chainalysis writeup on the $292M LayerZero/Kelp incident, April 18, 2026
- Reference framing: 1-of-1 DVN setup, RPC compromise, fake burn event
- Use this as the opening of the pitch

## Existing Code to Adapt

**Do not write the SSZ and MPT verifiers from scratch.** Adapt these:

### SSZ in Solidity
- **Succinct Telepathy contracts**: https://github.com/succinctlabs/telepathy-contracts
  - Look at their `src/libraries/SimpleSerialize.sol` for SSZ Merkle proof verification
- **Lido beacon oracle**: https://github.com/lidofinance/lido-dao
  - They verify beacon state roots in Solidity for their accounting oracle
- **eip-4788-proof**: search GitHub for recent EIP-4788 example implementations; they typically include the SSZ logic to go from beacon root → execution header

### MPT in Solidity
- **Hamdiallam/Solidity-RLP**: https://github.com/hamdiallam/Solidity-RLP — battle-tested RLP decoder
- **Optimism MPT verifier**: https://github.com/ethereum-optimism/optimism — they have an MPT library in their bedrock contracts (`packages/contracts-bedrock/src/libraries/trie/`)
- **Lido `MerklePatriciaProofVerifier`**: their staking router uses MPT proof verification in Solidity

### TypeScript SSZ
- **`@chainsafe/ssz`**: https://github.com/ChainSafe/ssz — official SSZ implementation
- **`@lodestar/types`**: https://github.com/ChainSafe/lodestar — beacon types with SSZ schemas already defined
- These can compute generalized indices and SSZ proofs for you. Use them. Don't reimplement.

### Reference Implementations of "EIP-4788 + state proof"
- Search GitHub for "eip4788 storage proof" — there are 2024–2025 reference projects that demonstrate the full chain
- Worth studying: any project that does "L2 reads L1 state via 4788"

## Known Risks and Mitigations

### Risk 1: SSZ Proof Encoding Mismatch
**The most likely failure mode.** TypeScript prover encodes the SSZ proof in a slightly different layout than Solidity verifier expects → all verifications fail.

**Mitigation**: Build an end-to-end "hello world" — verify a single known beacon root → known header proof — *first*, before doing anything else. Lock down the encoding. Use real Sepolia data, not synthetic.

### Risk 2: Hard Fork Generalized Index Drift
The generalized index of `execution_payload_header` inside `BeaconBlockBody` changes with hard forks (Bellatrix → Capella → Deneb → Pectra). Hardcoding the wrong one breaks everything.

**Mitigation**: Use the current fork's generalized index. Document it. Plan to handle fork transitions in v2 (not for the demo).

### Risk 3: MPT Proof Format Differences
`eth_getProof` returns proofs in a specific RLP-encoded format. Solidity MPT libraries expect specific input shapes. Mismatch = silent failures.

**Mitigation**: Use Optimism's MPT library and adapt their input-format expectations. Test with real RPC data early.

### Risk 4: Beacon Root Lag
EIP-4788 stores the beacon root for the *parent* slot, not the current. The block on Base may reference a beacon root that's a slot or two behind the actual head.

**Mitigation**: Don't try to prove the *latest* Ethereum block. Prove a block that's confirmed to be at least 32 slots old (one epoch). This is fine for a lending demo where the lock is hours old anyway.

### Risk 5: Public RPC Rate Limits
Public RPCs and beacon endpoints have rate limits. If demo day hits a limit, the prover hangs.

**Mitigation**: Pre-generate the proof bundles for the demo. Have backups. If live-generating, have multiple RPC endpoints in a fallback list.

### Risk 6: Time Sink on a Single Module
If SSZ takes 24 hours instead of 8, the rest collapses.

**Mitigation**: Hard checkpoint at hour 12. If SSZ + 4788 isn't working end-to-end on a real beacon root, simplify: skip the execution payload SSZ proof, hardcode the execution header for the demo, and just verify MPT proofs against a trusted Ethereum block hash. This loses the "fully trustless" framing for the demo but keeps the build alive. **Only fall back to this as last resort.**

## Scope Discipline

### CUT FROM V1:
- ❌ `historical_summaries` proofs (only support recent blocks via direct beacon root)
- ❌ Multiple source chains (Ethereum Sepolia only)
- ❌ Multiple destination chains (Base Sepolia only)
- ❌ Aave or other protocol integration (use our own simple Vault)
- ❌ Health factor / liquidation logic
- ❌ ZK compression of proofs
- ❌ Privacy features
- ❌ Verkle proof support
- ❌ Multi-slot batched proofs
- ❌ Fancy UI (functional > pretty)
- ❌ Production gas optimization
- ❌ Comprehensive test coverage (essential paths only)

### KEEP IN V1:
- ✅ The five-step verification chain end-to-end
- ✅ Vault on Sepolia, Lender on Base Sepolia
- ✅ TypeScript prover that works against public endpoints
- ✅ Verifier playground UI
- ✅ Lending demo UI
- ✅ Freshness check (`maxBlockAge`)
- ✅ Reproducible repo

### SAY IN ROADMAP / PITCH:
- 🔮 Verkle-ready architecture (post-migration: dramatically smaller proofs, cheaper verification, batched aggregation)
- 🔮 Other use cases: cross-chain governance, proof-of-reserves, credit, identity
- 🔮 `historical_summaries` for ~18-month history
- 🔮 Other rollups as destination chains (any chain with EIP-4788)

## Demo Plan

### The Verifier Playground
A standalone web page that proves the library works on arbitrary inputs.

**Inputs**:
- Account address (any contract on Sepolia)
- Storage slot key (any `bytes32`)
- Block number (within last ~256 blocks for simplicity)

**Buttons**:
- "Generate Proof" — runs prover client-side, shows assembled bundle
- "Verify On-Chain" — submits to verifier on Base Sepolia

**Output**:
- Verified value returned by contract
- Each verification step that passed: ✓ EIP-4788 lookup, ✓ Beacon header SSZ, ✓ Execution payload SSZ, ✓ Account proof MPT, ✓ Storage proof MPT, ✓ Freshness
- Gas used, total proof size, latency

This is the **credibility demonstration** — judges can plug in their own inputs and see real verification.

### The Lending Demo
Three-step flow on a single page:

1. **Lock** — connect to Sepolia, click "Lock 0.1 ETH", confirm in wallet, wait for confirmation. UI shows "Collateral locked at block N."
2. **Borrow** — switch to Base Sepolia, click "Borrow USDC". Behind the scenes, prover assembles bundle. Wallet pops up. Lender contract verifies, issues debt tokens. UI shows "Borrowed 0.05 USDC against 0.1 ETH locked on Ethereum."
3. **Repay & Settle** — burn debt, unlock vault on Sepolia, submit settlement proof on Base. UI shows loan closed.

Side panel throughout: live view of which proof step is executing.

This is the **value demonstration** — what the primitive enables.

### 5-Minute Pitch Script

**Minute 1 — The Stakes**
"On April 18, 2026, attackers stole $292 million from KelpDAO because their cross-chain bridge trusted a single off-chain operator. Every cross-chain protocol today has the same flaw — they trust someone outside the chain. We built the primitive that removes that trust entirely."

**Minute 2 — The Playground**
[Live demo of the playground] "I'm picking a random Sepolia contract and a random storage slot. Watch — the contract on Base Sepolia just verified, cryptographically, that this exact value exists in Ethereum's state. There is no service in this. No relayer. No oracle. The destination chain read from Ethereum using Ethereum's own beacon root, exposed via EIP-4788. The trust is in the math, not in us."

**Minute 3 — How**
[One architecture diagram] "EIP-4788 gives us Ethereum's consensus root. SSZ proofs let us extract the execution state root. Merkle Patricia proofs walk to the storage slot. Five steps, all in Solidity, all on-chain, all verifiable. No off-chain infrastructure — not ours, not anyone's."

**Minute 4 — The Lending Demo**
[Live demo] "Lock ETH on Sepolia. Open Base. Borrow USDC. The lender just verified the lock by walking the proofs. Repay. Unlock. The collateral never moved. No bridge. No DVN."

**Minute 5 — The Pitch**
"This is a Solidity library. Anyone can import it. Cross-chain governance, proof-of-reserves, credit, identity — all become two-contract problems instead of multi-million-dollar bridge problems. Open source. Verkle-ready. Built for Ethereum's stateless future. We're shipping the verification layer the Kelp hack proved we needed."

### Hackathon Track: ETHPrague Ethereum Core
Submission framing:
- "Foundational infrastructure for trustless cross-chain reads"
- Directly addresses the security failure mode demonstrated by Kelp
- Aligns with Ethereum's stateless / Verkle roadmap
- Open-source library other projects integrate

## The Pitch (One-Paragraph Version)

> Cross-chain bridges and oracles have lost billions because they trust off-chain operators. We built a Solidity library that lets any EVM rollup verify Ethereum L1 state directly — using EIP-4788, beacon header proofs, and Merkle-Patricia tries — with no relayer, no DVN, no service running anywhere. Lock collateral on Ethereum, borrow on Base, with cryptographic proof instead of trusted attestations. Same primitive enables cross-chain governance, proof-of-reserves, credit, identity. Open-source library, single-import integration, Verkle-ready architecture aligned with Ethereum's stateless future.

---

## Glossary (for the AI Agent)

- **EIP-4788**: Ethereum proposal that exposes the beacon block root inside the EVM via a precompile contract. Available on Ethereum L1 and Ethereum-aligned rollups (Base, Optimism, Arbitrum, etc.).
- **Beacon Root**: 32-byte hash that commits to all of Ethereum's consensus-layer data at a specific slot.
- **Beacon Block Header**: Top-level structure on Ethereum's consensus layer. Contains: slot, proposer_index, parent_root, state_root (consensus state), body_root.
- **Beacon Block Body**: Contains attestations, deposits, the execution payload, and other consensus data.
- **Execution Payload (Header)**: The "Ethereum block" as the EVM sees it — embedded inside the beacon block body. Contains: parent_hash, fee_recipient, state_root (execution state — what we want), receipts_root, block_hash, block_number, timestamp, etc.
- **SSZ (Simple Serialize)**: Ethereum's consensus-layer data format. Defines how structured objects are hashed into Merkle trees with predictable field positions.
- **Generalized Index**: An integer identifying a specific position in an SSZ Merkle tree. Used to verify Merkle proofs to a known field.
- **MPT (Merkle Patricia Trie)**: Ethereum's execution-layer data structure. State trie + per-account storage tries. Uses RLP-encoded nodes with three types: branch, extension, leaf.
- **RLP (Recursive Length Prefix)**: Ethereum's serialization format for execution-layer data.
- **`eth_getProof`**: JSON-RPC method (EIP-1186) that returns the account proof + storage proofs for a given account and slots at a given block.
- **DVN (Decentralized Verifier Network)**: LayerZero's term for off-chain validators that attest to source-chain events. Compromised in the Kelp hack.

---

## Final Notes for the AI Agent

1. **Read existing libraries before writing code.** The SSZ and MPT logic should be adapted from the references above, not invented. Time spent reading their code is time saved debugging your own.

2. **Build end-to-end first, optimize later.** Even an ugly verifier that succeeds on one known input is better than a pretty one that doesn't work yet. Get the full chain green, then iterate.

3. **Use real Sepolia/Base Sepolia data from day one.** Synthetic test fixtures hide encoding bugs. Real RPC + real beacon API output is the only ground truth.

4. **Test the prover output against the verifier early.** The TypeScript ↔ Solidity boundary is the highest-risk interface. Lock its format down on day one.

5. **Don't add features not listed in "KEEP IN V1".** Every feature added in scope is a feature that increases the risk of nothing shipping.

6. **The library is the product. The lending demo is the marketing.** Optimize quality of the library; optimize speed-of-delivery for the demo.

7. **When stuck, simplify.** Better a working demo with smaller scope than a broken one with full scope. Cut features ruthlessly to keep the critical path alive.

Good luck. Build the trustless layer.
