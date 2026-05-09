// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { EIP4788 } from "../lib/EIP4788.sol";

contract BeaconRootsDebug {
    function get(uint64 timestamp) external view returns (bytes32) {
        return EIP4788.getBeaconRoot(timestamp);
    }
}
