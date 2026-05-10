# Consumer Pattern

The verifier proves truth. Your app decides relevance.

That means most integrations should follow the same shape:

1. accept a `ProofBundle`
2. call `verifyStorageSlot`
3. validate `sourceAccount`
4. validate `sourceSlot`
5. decode `verifiedValue`
6. apply app-specific rules

## Why this matters

A proof can be cryptographically valid and still be irrelevant to your application.

For example:

- the source account may not be the contract your app expects
- the slot may be a different mapping entry
- the proof may be too old for your risk model
- the slot value may be valid but semantically unusable for your app

## Minimal reference

The reference consumer in this repo does exactly the minimum safe checks:

- [contracts/src/examples/VerifiedSlotConsumer.sol](/Users/razvan/Repos/ETH_Prague_Hackathon/contracts/src/examples/VerifiedSlotConsumer.sol)

## Suggested app-level checks

At a minimum:

- check `sourceAccount`
- check `sourceSlot`
- choose a defensible `maxProofAge`

Then add domain-specific interpretation:

- governance app checks token-balance threshold
- access-control app checks nonzero verified ownership
- lending app checks collateral semantics and freshness constraints

