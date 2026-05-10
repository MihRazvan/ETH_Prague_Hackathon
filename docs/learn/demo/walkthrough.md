# Demo Walkthrough

The current demo flow is intentionally simple.

It starts from an Ethereum fact that already exists:

- an ETH lock in the Sepolia vault

Then it shows the destination-side flow:

1. select a live source fact
2. generate a proof bundle
3. submit that bundle on Base
4. verify the proof against EIP-4788
5. unlock the destination-side result

## What the demo is proving

The important claim is not "this UI can call a contract."

The important claim is:

> a contract on Base can trust a real fact about Ethereum state

without relying on a separate bridge, signer set, or application-specific relayer.

## What to say during the demo

A simple product-level narration works best:

- pick a real Ethereum fact
- generate the proof bundle
- verify it on Base
- let the Base app act on that verified fact

The technical walkthrough can then be covered separately with the architecture diagram.

