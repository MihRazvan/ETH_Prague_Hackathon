// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { SSZ } from "../src/lib/SSZ.sol";

contract SSZTest is Test {
    function test_restoreMerkleRoot() external pure {
        bytes32 leafA = sha256("a");
        bytes32 leafB = sha256("b");
        bytes32 leafC = sha256("c");
        bytes32 leafD = sha256("d");

        bytes32 left = sha256(bytes.concat(leafA, leafB));
        bytes32 right = sha256(bytes.concat(leafC, leafD));
        bytes32 root = sha256(bytes.concat(left, right));

        bytes32[] memory branch = new bytes32[](2);
        branch[0] = leafD;
        branch[1] = left;

        bytes32 restored = SSZ.restoreMerkleRoot(leafC, 6, branch);
        assertEq(restored, root);
        assertTrue(SSZ.isValidMerkleBranch(leafC, 6, branch, root));
    }

    function test_beaconBlockHeaderRootMatchesManualTree() external pure {
        uint64 slot = 128;
        uint64 proposerIndex = 12;
        bytes32 parentRoot = keccak256("parent");
        bytes32 stateRoot = keccak256("state");
        bytes32 bodyRoot = keccak256("body");

        bytes32 computed = SSZ.beaconBlockHeaderRoot(slot, proposerIndex, parentRoot, stateRoot, bodyRoot);

        bytes32 left = sha256(
            bytes.concat(
                sha256(bytes.concat(SSZ.toLittleEndian(slot), SSZ.toLittleEndian(proposerIndex))),
                sha256(bytes.concat(parentRoot, stateRoot))
            )
        );
        bytes32 right = sha256(
            bytes.concat(
                sha256(bytes.concat(bodyRoot, bytes32(0))),
                sha256(bytes.concat(bytes32(0), bytes32(0)))
            )
        );

        assertEq(computed, sha256(bytes.concat(left, right)));
    }
}
