// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { Vault } from "../src/demo/Vault.sol";

contract DeployVault is Script {
    function run() external returns (Vault vault) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        vault = new Vault();
        vm.stopBroadcast();
    }
}
