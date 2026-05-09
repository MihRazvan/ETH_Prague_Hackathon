// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { Lender } from "../src/demo/Lender.sol";

contract DeployLender is Script {
    function run() external returns (Lender lender) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address verifier = vm.envAddress("VERIFIER_ADDRESS");
        address vault = vm.envAddress("VAULT_ADDRESS");
        uint256 ltvBps = vm.envOr("LTV_BPS", uint256(5_000));
        uint256 maxProofAge = vm.envOr("MAX_PROOF_AGE", uint256(1 hours));

        vm.startBroadcast(deployerKey);
        lender = new Lender(verifier, vault, ltvBps, maxProofAge);
        vm.stopBroadcast();
    }
}
