# Demo Script

## Setup

1. Deploy `Vault` on Ethereum Sepolia.
2. Deploy `BeaconStateProof` and `Lender` on Base Sepolia.
3. Pre-fund the demo wallet with Sepolia ETH and Base Sepolia gas.
4. Keep one pre-generated proof bundle ready as fallback.

## Live path

1. Open `/playground`.
2. Enter the vault address, borrower slot, and a recent Sepolia block number.
3. Explain the five verification steps shown in the UI.
4. Switch to `/lending`.
5. Lock `0.1 ETH` on Sepolia.
6. Generate a proof and borrow on Base.
7. Repay.
8. Unlock on Sepolia and settle on Base.

## Talk track

- The collateral never moved.
- No bridge contract held the ETH.
- No relayer signed anything.
- The destination chain verified Ethereum state from Ethereum's own beacon root.

## Fallback line

If live proof generation is slow, switch to the pre-generated bundle and keep the explanation focused on the verifier steps and resulting state transition.
