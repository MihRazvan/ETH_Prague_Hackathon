// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "../interfaces/IBeaconStateProof.sol";

contract VerifiedSlotConsumer {
    error InvalidSourceAccount(address expected, address actual);
    error InvalidSourceSlot(bytes32 expected, bytes32 actual);

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

    function readVerifiedValue(IBeaconStateProof.ProofBundle calldata proof)
        external
        view
        returns (bytes32 verifiedValue, uint64 sourceBlockNumber)
    {
        address sourceAccount;
        bytes32 sourceSlot;

        (verifiedValue, sourceBlockNumber, sourceAccount, sourceSlot) = verifier.verifyStorageSlot(proof, maxProofAge);

        if (sourceAccount != expectedSourceAccount) {
            revert InvalidSourceAccount(expectedSourceAccount, sourceAccount);
        }

        if (sourceSlot != expectedSourceSlot) {
            revert InvalidSourceSlot(expectedSourceSlot, sourceSlot);
        }
    }
}
