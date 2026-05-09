# WC3 Frontend Content Pack

This is the copy and asset-direction handoff for a Warcraft III-inspired presentation layer around the proof library.

The key constraint:

- the app should feel memorable and stylized
- the underlying information still needs to read like serious Ethereum infrastructure

## Tone

Mix:

- high-fantasy interface framing
- terse systems language
- cryptography-first credibility

Think:

- "mission control in Azeroth"
- not parody
- not game cosplay for its own sake

## Theme Rules

Use Warcraft III influence in:

- panel frames
- beveled buttons
- engraved section headers
- status badges
- metallic, rune-like dividers

Do not over-theme:

- hashes
- calldata
- metrics
- proof-step details

The proof content still needs to feel like a real devtool.

## Global UI Copy

### Top Nav

- `BeaconStateProof`
- `Watch Demo`
- `Inspect Proof`
- `Proof Library`
- `Docs`

### Global Status Strip

- `Source Realm: Ethereum Sepolia`
- `Destination Realm: Base Sepolia`
- `Anchor: EIP-4788 Beacon Root`
- `Mode: Trustless Read`

## Page 1: Landing

### Hero Eyebrow

- `Ethereum Core Track`

### Hero Headline

- `Summon Ethereum state on Base. No relayers. No committees. No oracle theater.`

### Hero Subhead

- `BeaconStateProof is a trustless cross-chain read stack built on EIP-4788, SSZ, and Merkle Patricia proofs. It verifies recent Ethereum storage directly on Base using Ethereum's own consensus root.`

### Primary CTA

- `Watch the Demo`

### Secondary CTA

- `Inspect a Live Proof`

### Value Cards

- `Trust Anchor`
  - `Beacon roots exposed by the destination chain itself`
- `Verification Path`
  - `SSZ branch verification + Ethereum account and storage trie walks`
- `Delivery Model`
  - `User-submitted proof bundles, no verifier service in the trust path`

### Highlight Strip

- `Live Sepolia -> Base proof flow already working`
- `Native Base Sepolia borrow executed from a verified Sepolia slot`
- `Built as importable infrastructure, not a closed demo backend`

## Page 2: Demo Hub

### Page Title

- `Choose Your Encounter`

### Subhead

- `For non-dev judges and first-time visitors. One click, one story, one visible result.`

### Demo Card A

- Title: `Fresh Proof Demo`
- Body: `A recent Sepolia state change is proven on Base in seconds using only protocol roots and proof data.`
- CTA: `Play Fresh Proof`

### Demo Card B

- Title: `Forged Message Comparison`
- Body: `See how a trusted attestation path can fail under operator compromise, while a cryptographic state proof rejects the same lie.`
- CTA: `Play Comparison`

### Demo Card C

- Title: `Library Inspector`
- Body: `Open the full verification pipeline and inspect the exact bytes, hashes, and proof path the contracts consume.`
- CTA: `Enter Inspector`

### Side Note Copy

- `These demos are scripted on top of the same proof pipeline exposed to developers. Nothing here depends on a private verifier backend.`

## Page 3: Demo A - Fresh Proof

### Title

- `Fresh Proof: Ethereum State, Reconstructed on Base`

### Intro Text

- `A user changes state on Ethereum Sepolia. Moments later, the exact slot is verified on Base Sepolia through Ethereum's own consensus root.`

### Timeline Labels

- `1. Source state changes on Sepolia`
- `2. Beacon header and blinded block are fetched`
- `3. SSZ path to execution payload is rebuilt`
- `4. Base reads the EIP-4788 anchor`
- `5. Account and storage trie proofs are verified`
- `6. Slot value is accepted on-chain`

### Result Panel Labels

- `Verified Slot`
- `Source Block`
- `Proof Age`
- `Verification Gas`
- `Result`

### Result Copy

- `The destination contract accepted this value because every intermediate root was reconstructed from Ethereum-authenticated data.`

## Page 4: Demo B - Forged Message Comparison

### Title

- `Forged Message vs. Cryptographic State Proof`

### Left Column Title

- `Trusted Message Path`

### Left Column Copy

- `A bridge-style flow trusts an operator or verifier set to attest that an event occurred on the source chain. If that trust layer lies or is compromised, the destination contract can accept a false message.`

### Left Column Stages

- `Event claimed`
- `Off-chain verifier signs`
- `Destination contract trusts signature`
- `Forged message succeeds`

### Right Column Title

- `BeaconStateProof Path`

### Right Column Copy

- `This path does not ask an operator what happened on Ethereum. It reconstructs the claim from the source chain's authenticated state roots. No valid proof, no valid state transition.`

### Right Column Stages

- `Claim submitted`
- `Beacon anchor checked`
- `SSZ root rebuilt`
- `Trie path verified`
- `Forgery rejected`

### Bottom Banner

- `Trusted messages can be forged. Ethereum state roots cannot be negotiated.`

## Page 5: Inspector

### Title

- `Proof Inspector`

### Subhead

- `A developer-facing verification surface for inspecting account proofs, storage proofs, SSZ branches, calldata, timing, and gas.`

### Left Panel

- Title: `Proof Query`
- Fields:
  - `Source Contract`
  - `Storage Slot Key`
  - `Source Execution Block`
- Presets:
  - `Load Native Sepolia Vault Proof`
  - `Load Fresh Demo Proof`
  - `Reset`
- Actions:
  - `Generate Proof`
  - `Verify On Base`

### Center Panel

- Title: `Verification Ladder`
- Step labels:
  - `Fetch State Proof`
  - `Fetch Beacon Header`
  - `Build SSZ Branch`
  - `Read EIP-4788 Anchor`
  - `Verify Account Trie`
  - `Verify Storage Trie`

### Right Panel Tabs

- `Decoded`
- `Raw Bytes`
- `Calldata`
- `Metrics`

### Metrics Labels

- `Proof Bundle Size`
- `End-to-End Latency`
- `Estimated Gas`
- `Source Block Age`
- `Destination Anchor Timestamp`

## Page 6: Proof Library

### Title

- `What Ships in the Stack`

### Cards

- `Solidity Verifier`
  - `EIP-4788 anchor lookup, SSZ verification, MPT verification, freshness checks`
- `TypeScript Prover`
  - `Builds live proof bundles from public RPC + beacon endpoints`
- `Demo Contracts`
  - `Reference flows showing recent-state verification in practice`
- `Inspector UI`
  - `Visual debugging surface for developers integrating the proof stack`

### CTA

- `Read the Architecture`
- `Open the Repo`

## Visual Asset Direction

Create or source mock assets for:

- bronze/stone panel frames
- rune divider lines
- gold-etched buttons
- teal and blue status glows
- minimap-style corner ornament for the inspector
- icon set:
  - beacon root
  - hash branch
  - trie node
  - forged message
  - accepted proof
  - rejected proof

## Color Direction

- `Abyss Blue` for the page background
- `Storm Teal` for trusted / verified states
- `Alliance Gold` for primary actions
- `Ash Bronze` for panel frames
- `Fel Red` for forged / failed states

## Typography Direction

Use:

- one display face for hero and section headers
- one monospace face for hashes, values, and calldata
- one readable UI sans for body copy

Avoid:

- overly ornate fantasy text for body copy
- anything that makes technical data hard to scan

## Practical Designer Note

The strongest visual split is:

- landing + demo hub = more theatrical
- inspector = cleaner and more tool-like

That gives you memorability without sacrificing legibility when judges or developers inspect the real proof pipeline.
