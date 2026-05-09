// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "../../src/interfaces/IBeaconStateProof.sol";

contract MockBeaconStateProof is IBeaconStateProof {
    bytes32 public value;
    uint64 public blockNumber;
    address public account;
    bytes32 public slot;

    function setResult(bytes32 value_, uint64 blockNumber_, address account_, bytes32 slot_) external {
        value = value_;
        blockNumber = blockNumber_;
        account = account_;
        slot = slot_;
    }

    function verifyStorageSlot(ProofBundle calldata, uint256)
        external
        view
        override
        returns (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot)
    {
        return (value, blockNumber, account, slot);
    }
}
