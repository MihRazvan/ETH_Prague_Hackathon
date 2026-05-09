// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { BeaconStateProof } from "../../src/BeaconStateProof.sol";

contract BeaconStateProofHarness is BeaconStateProof {
    constructor() BeaconStateProof(address(0)) { }

    function extractStorageRoot(bytes memory accountRlp) external pure returns (bytes32) {
        return _extractStorageRoot(accountRlp);
    }

    function decodeStorageValue(bytes memory storageRlp) external pure returns (bytes32) {
        return _decodeStorageValue(storageRlp);
    }
}
