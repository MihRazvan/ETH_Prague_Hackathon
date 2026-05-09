// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { BeaconStateProof } from "../src/BeaconStateProof.sol";

contract DeployVerifier is Script {
    function run() external returns (BeaconStateProof verifier) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address beaconRoots = vm.envOr("BEACON_ROOTS_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);
        verifier = new BeaconStateProof(beaconRoots);
        vm.stopBroadcast();
    }
}
