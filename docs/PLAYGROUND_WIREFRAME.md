# Playground Wireframe

This is a handoff brief for a stronger hackathon presentation layer around the existing verifier stack.

## Product Goal

Turn the current webapp into two clear entry points:

1. `Watch Demo`
2. `Inspect a Proof`

The point is to serve both audiences:

- judges who want a memorable, guided story
- technical judges and developers who want to inspect the cryptographic pipeline

## Core Positioning

This is not a general DeFi app.

It is:

- a trustless cross-chain read primitive
- a visual inspector for EIP-4788 + SSZ + MPT verification
- a demo surface that makes the primitive legible in under 60 seconds

## Information Architecture

### 1. Landing Page

Purpose:

- make the project legible immediately
- split people into the right mode

Sections:

- Hero
  - headline: trustless cross-chain reads from Ethereum to Base
  - subhead: verify recent Ethereum state on Base without relayers or verifier committees
- Primary actions
  - `Watch Demo`
  - `Inspect a Proof`
- Why this matters strip
  - `Trust anchor: EIP-4788`
  - `Proof path: SSZ + MPT`
  - `No service in trust path`

### 2. Demo Mode

Purpose:

- one-click wow moment
- minimal cognitive load

Recommended demo cards:

- `Fresh Proof Demo`
  - use a recent real proof from the live stack
  - story: lock on Sepolia, verify on Base seconds later
- `Forged Message Comparison`
  - story: a trusted attestation path can accept a fake message; a cryptographic state proof cannot

Each demo should have:

- a short narrative line
- one large CTA
- auto-play step timeline
- final result card

### 3. Inspector Mode

Purpose:

- developer-facing proof debugger
- show technical depth during judging

Layout:

- Left column: proof query form
- Center column: verification pipeline
- Right column: raw proof / decoded data / metrics

## Inspector Screen

### Left Column: Inputs

Fields:

- source contract address
- storage slot key
- source execution block

Helpers:

- preset queries
- recent successful proof preset
- clear / reset

CTA:

- `Generate Proof`
- `Verify On Base`

### Center Column: Verification Pipeline

Six stacked cards, animated from pending to success/failure:

1. Fetch account + storage proof
2. Fetch beacon header / blinded block
3. Build SSZ branch to `execution_payload_header`
4. Read destination beacon root anchor
5. Verify account trie path
6. Verify storage trie path and decode result

Each card should expose:

- status
- short explanation
- elapsed time
- gas or estimated gas where relevant

Optional visual:

- a simplified beacon block structure panel beside the SSZ step
- highlight only the verified path, not the full giant tree

### Right Column: Detail Rail

Tabs:

- `Decoded`
- `Raw Proof`
- `Calldata`
- `Metrics`

Recommended metrics:

- total proof size
- total end-to-end latency
- estimated verification gas
- source block age

## Visual Direction

Recommended approach:

- keep the inspector clean and legible
- let the landing/demo surfaces carry more personality
- if using Warcraft III influence, apply it to framing, buttons, chrome, and section containers
- do not let theme hurt readability of hashes, code, or proof steps

## Realistic Scope For Hackathon

Must-have:

- landing split into demo vs inspector
- one fresh-proof scripted demo
- one forged-message comparison demo
- inspector with six verification cards
- right-side detail rail

Nice-to-have:

- stylized beacon structure mini-map
- theatrical theme treatment
- tamper preset that flips one proof byte and shows failure

Avoid for v1:

- full 3D scene
- giant force-directed proof tree
- fully free-form proof editing UI

## Demo Script Support

The UI should support this exact sequence:

1. Open landing page
2. Click `Watch Demo`
3. Run fresh-proof demo
4. Run forged-message comparison
5. Jump into inspector
6. Show the six-step pipeline and raw bytes

If a judge only watches for 45 seconds, they should still understand:

- what is being proven
- why this is different from relayers
- that the library is real and developer-usable
