# Solidity Quickstart

This is the shortest path for verifying an Anyware proof bundle inside a destination-chain contract.

## Install

### npm-style install

```bash
pnpm add anyware-solidity
```

### Foundry install

Current GitHub install path:

```bash
forge install MihRazvan/ETH_Prague_Hackathon@v0.1.0
```

Then add a remapping that points to the Solidity package surface you want to import.

## Import the interface

```solidity
import { IBeaconStateProof } from "anyware-solidity/src/interfaces/IBeaconStateProof.sol";
```

## Call the verifier

Your app usually depends on an already-deployed verifier address:

```solidity
contract ExampleConsumer {
    IBeaconStateProof public immutable verifier;
    address public immutable expectedSourceAccount;
    bytes32 public immutable expectedSourceSlot;
    uint256 public immutable maxProofAge;

    constructor(address verifier_, address sourceAccount_, bytes32 sourceSlot_, uint256 maxProofAge_) {
        verifier = IBeaconStateProof(verifier_);
        expectedSourceAccount = sourceAccount_;
        expectedSourceSlot = sourceSlot_;
        maxProofAge = maxProofAge_;
    }

    function consume(IBeaconStateProof.ProofBundle calldata proof) external view returns (bytes32) {
        (bytes32 verifiedValue,, address sourceAccount, bytes32 sourceSlot) =
            verifier.verifyStorageSlot(proof, maxProofAge);

        require(sourceAccount == expectedSourceAccount, "wrong source account");
        require(sourceSlot == expectedSourceSlot, "wrong source slot");

        return verifiedValue;
    }
}
```

## What gets returned

`verifyStorageSlot` returns:

- `verifiedValue`
- `sourceBlockNumber`
- `sourceAccount`
- `sourceSlot`

Your contract must still decide:

- whether that source account is relevant
- whether that slot is the one your app expects
- how fresh the proof must be
- how to interpret the slot value

## Reference example

See:

- [contracts/src/examples/VerifiedSlotConsumer.sol](/Users/razvan/Repos/ETH_Prague_Hackathon/contracts/src/examples/VerifiedSlotConsumer.sol)

