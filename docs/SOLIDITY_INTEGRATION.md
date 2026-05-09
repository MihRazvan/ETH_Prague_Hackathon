# Solidity Integration

Anyware’s Solidity surface is the onchain verifier:

- [contracts/src/BeaconStateProof.sol](/Users/razvan/Repos/ETH_Prague_Hackathon/contracts/src/BeaconStateProof.sol)
- [contracts/src/interfaces/IBeaconStateProof.sol](/Users/razvan/Repos/ETH_Prague_Hackathon/contracts/src/interfaces/IBeaconStateProof.sol)

It verifies a proof bundle against:

1. EIP-4788 beacon root on the destination chain
2. SSZ inclusion proof from beacon block body to execution payload header
3. MPT account proof under the execution `stateRoot`
4. MPT storage proof under the account `storageRoot`

## Minimal consumer shape

```solidity
import { IBeaconStateProof } from "./interfaces/IBeaconStateProof.sol";

contract ExampleConsumer {
    IBeaconStateProof public immutable verifier;
    address public immutable expectedSourceAccount;
    bytes32 public immutable expectedSourceSlot;

    constructor(address verifier_, address sourceAccount_, bytes32 sourceSlot_) {
        verifier = IBeaconStateProof(verifier_);
        expectedSourceAccount = sourceAccount_;
        expectedSourceSlot = sourceSlot_;
    }

    function consume(IBeaconStateProof.ProofBundle calldata proof) external view returns (bytes32) {
        (bytes32 verifiedValue,, address sourceAccount, bytes32 sourceSlot) =
            verifier.verifyStorageSlot(proof, 1 hours);

        require(sourceAccount == expectedSourceAccount, "wrong source account");
        require(sourceSlot == expectedSourceSlot, "wrong source slot");

        return verifiedValue;
    }
}
```

## What your contract should validate

Even after cryptographic verification succeeds, your app contract should still check:

- `sourceAccount`
- `sourceSlot`
- freshness policy (`maxAge`)
- app-specific meaning of `verifiedValue`

That is the difference between “proof is valid” and “proof is relevant to my app.”

## Reference consumer

See [contracts/src/demo/Lender.sol](/Users/razvan/Repos/ETH_Prague_Hackathon/contracts/src/demo/Lender.sol) for a complete example that:

- verifies the source account
- verifies the exact source slot
- decodes the returned value
- applies lending-specific rules afterward
