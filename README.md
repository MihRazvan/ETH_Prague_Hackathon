# ANYWARE
<img width="1920" height="360" alt="banner" src="https://github.com/user-attachments/assets/63058357-9802-420a-b31e-373184737080" />

Anyware is a trustless cross-chain state verification system that lets EVM rollups verify recent Ethereum state directly onchain using [EIP-4788](https://eips.ethereum.org/EIPS/eip-4788) beacon roots.

[Project Brief](https://github.com/MihRazvan/ETH_Prague_Hackathon/blob/main/PROJECT_BRIEF.md) | [Devfolio](https://devfolio.co/projects/ag-1f6a)

---

[Landing Page](https://eth-prague-hackathon-u6s2.vercel.app/) | [Demo App](https://eth-prague-hackathon-u6s2.vercel.app/demo) | [Showcase]() | [Quickstart](https://github.com/MihRazvan/ETH_Prague_Hackathon/blob/main/docs/QUICKSTART.md) | [Solidity Integration](https://github.com/MihRazvan/ETH_Prague_Hackathon/blob/main/docs/SOLIDITY_INTEGRATION.md) | [Technical Architecture](https://github.com/MihRazvan/ETH_Prague_Hackathon/blob/main/docs/ARCHITECTURE.md) | [Docs](https://github.com/MihRazvan/ETH_Prague_Hackathon/tree/main/docs)

---

## Problem First

Most cross-chain systems still depend on trust: A relayer says an event happened. A bridge signs a message. An oracle forwards state between chains.

That extra trust layer has repeatedly become the weakest point in cross-chain infrastructure.

<img width="4981" height="1927" alt="landing page 8" src="https://github.com/user-attachments/assets/64b7f31c-24d9-406e-9ac4-68acbadb4452" />

Anyware exists to remove that dependency. Instead of importing trust from an external network, it imports cryptographic evidence directly from Ethereum itself.

**The destination chain independently verifies:**
- the beacon block really existed in Ethereum consensus
- the execution block was included inside that beacon block
- the execution stateRoot is authentic
- the account exists under that state root
- the storage slot exists under that account storage root
- the slot value matches the claimed state

No relayer trust. No multisig bridge trust. No oracle trust. Only Ethereum consensus and cryptographic inclusion proofs.

---

## Overview

Anyware is a two-part system:
- An offchain prover
- An onchain verifier

The prover gathers publicly available Ethereum execution and beacon-chain data, assembles trie proofs and SSZ proofs, and packages them into a portable bundle. The verifier consumes that bundle and validates it entirely onchain against the destination chain’s native EIP-4788 beacon-root oracle.

### Core Principles

1. **Trust Ethereum Consensus, Not Middleware:** Ethereum already exposes consensus roots through EIP-4788. Anyware builds directly on top of that trust anchor.

2. **Proofs Over Messages:** The system verifies state cryptographically instead of accepting externally signed claims.

3. **Verification Happens Onchain:** Offchain infrastructure assembles evidence. Smart contracts decide truth. Cross-Chain reads should feel native. Ethereum state becomes locally verifiable on any EVM exposing beacon roots.

4. **Cross-Chain Reads Should Feel Native:** Ethereum state becomes locally verifiable on any EVM chain exposing beacon roots.

---

## How It Works

At a high level, Anyware proves this statement:

> *This exact Ethereum storage slot had this exact value in this exact execution block, and that execution block was really finalized by Ethereum consensus.*

<img width="4981" height="2378" alt="flow 1" src="https://github.com/user-attachments/assets/e77ede6d-7fb0-4764-b80b-48d86959f487" />

### Offchain prover

**The prover:**
1. fetches Ethereum execution-state proofs using eth_getProof
2. gathers account and storage trie branches
3. finds the matching beacon block
4. builds the SSZ Merkle branch for the execution payload header
5. resolves the destination-chain EIP-4788 timestamp anchor
6. packages everything into a portable proof bundle

> *The prover assembles publicly verifiable evidence.*

### Onchain Verifier

**The Solidity verifier:**
1. reads the beacon root through EIP-4788
2. recomputes the beacon block header root
3. proves the execution payload header is included in the beacon block
4. derives the trusted execution stateRoot
5. walks the Ethereum account trie
6. walks the Ethereum storage trie
7. recovers the proven storage slot value

> *If every proof passes, the destination contract can safely act on Ethereum state as if it had verified it locally.*

---

## Demo: Trustless Lending

The included demo shows trustless cross-chain lending between Ethereum Sepolia and Base Sepolia.

**Flow:**
A user locks ETH inside a vault contract on Ethereum Sepolia. The prover assembles a proof bundle for the vault storage state. The proof is submitted to Base Sepolia. The verifier validates the proof against the chain’s EIP-4788 beacon root. The lender contract issues demo USDC based on the verified collateral state.

**The lender never trusts:**

A relayer, bridge operator, message signer, or an oracle network. It trusts only Ethereum consensus proofs.

### Anyware can power:

trustless lending | governance verification | proof-of-reserves systems | identity attestations | cross-chain reputation | state-aware rollup interoperability

---

## The Verification Path

Anyware puts together two different proof systems:

1. **Beacon-Chain Consensus Proofs:** Used to prove the execution payload header belongs to a real Ethereum beacon block.

- SSZ Merkleization
- SHA-256 hashing
- generalized indices

> *This links execution state to Ethereum consensus.*

2. **Ethereum Execution-State Proofs:** Used to prove the account and storage slot under the execution stateRoot.

- Merkle Patricia Tries
- Keccak-256
- RLP decoding

> *This links the storage slot to the execution state root.*

### Full Trust Path

EIP-4788 beacon root → Beacon block header root → Execution payload inclusion proof → Execution stateRoot → Ethereum account proof → Ethereum storage proof → Verified storage slot value

> *That is the complete trust path from Ethereum consensus to an application-level fact on L2.*

---

## Tech Stack

| Component        | Technology                   | Purpose                                  |
| ---------------- | ---------------------------- | ---------------------------------------- |
| Consensus Anchor | **EIP-4788**                 | Native Ethereum beacon-root access       |
| Consensus Proofs | **SSZ + SHA-256**            | Beacon-chain inclusion verification      |
| Execution Proofs | **MPT + RLP + Keccak-256**   | Ethereum state verification              |
| Verifier         | **Solidity**                 | Onchain proof verification               |
| Prover           | **TypeScript**               | Proof gathering and assembly             |
| Target Chains    | **EVM rollups**              | Trust-minimized cross-chain verification |

---

## Deployments

1. [https://www.npmjs.com/package/anyware-prover](https://www.npmjs.com/package/anyware-prover)
2. [https://www.npmjs.com/package/anyware-solidity](https://www.npmjs.com/package/anyware-solidity)

### Demo

1. **Vault Address:** [0x48b62900Ee9eab10920cB8a1b3d1a36e13B117e6](https://sepolia.etherscan.io/address/0x48b62900Ee9eab10920cB8a1b3d1a36e13B117e6#code)
2. **Verifier Address:** [0x65dCeaa5B29748aFD22b4f93A7A51Ea5bc785081](https://sepolia.basescan.org/address/0x65dCeaa5B29748aFD22b4f93A7A51Ea5bc785081#code)
3. **Lender Address:** [0xF57b153376a56c43f1045b7199E78AAb48d3e150](https://sepolia.basescan.org/address/0xF57b153376a56c43f1045b7199E78AAb48d3e150#code)

---

Built with <3 during ETHPrague 2026.
