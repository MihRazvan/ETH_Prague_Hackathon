// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { BeaconStateProof } from "../src/BeaconStateProof.sol";
import { IBeaconStateProof } from "../src/interfaces/IBeaconStateProof.sol";
import { SSZ } from "../src/lib/SSZ.sol";
import { MockBeaconRoots } from "./mocks/MockBeaconRoots.sol";

contract BeaconStateProofTest is Test {
    BeaconStateProof internal verifier;
    MockBeaconRoots internal beaconRoots;

    function setUp() external {
        beaconRoots = new MockBeaconRoots();
        verifier = new BeaconStateProof(address(beaconRoots));
    }

    function test_revertsForStaleProof() external {
        IBeaconStateProof.ProofBundle memory proof = _sampleProof();
        vm.warp(proof.executionHeader.timestamp + 2 hours);

        vm.expectRevert(
            abi.encodeWithSelector(BeaconStateProof.StaleProof.selector, proof.executionHeader.timestamp, 1 hours, block.timestamp)
        );
        verifier.verifyStorageSlot(proof, 1 hours);
    }

    function test_revertsForMismatchedBeaconHeaderRoot() external {
        IBeaconStateProof.ProofBundle memory proof = _sampleProof();
        beaconRoots.setRoot(proof.timestamp, keccak256("wrong-root"));

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForInvalidExecutionPayloadProof() external {
        IBeaconStateProof.ProofBundle memory proof = _sampleProof();
        bytes32 headerRoot =
            SSZ.beaconBlockHeaderRoot(proof.slot, proof.proposerIndex, proof.parentRoot, proof.stateRoot, proof.bodyRoot);
        beaconRoots.setRoot(proof.timestamp, headerRoot);

        vm.expectRevert(BeaconStateProof.InvalidExecutionPayloadProof.selector);
        verifier.verifyStorageSlot(proof, 0);
    }

    function _sampleProof() internal pure returns (IBeaconStateProof.ProofBundle memory proof) {
        proof.timestamp = 1_700_000_000;
        proof.slot = 1234;
        proof.proposerIndex = 77;
        proof.parentRoot = keccak256("parent");
        proof.stateRoot = keccak256("beacon-state");
        proof.bodyRoot = keccak256("body-root");
        proof.executionPayloadGIndex = 1;
        proof.account = address(0x1234);
        proof.slotKey = bytes32(uint256(7));

        proof.executionHeader.parentHash = keccak256("payload-parent");
        proof.executionHeader.feeRecipient = address(0xFEED);
        proof.executionHeader.stateRoot = keccak256("execution-state");
        proof.executionHeader.receiptsRoot = keccak256("receipts");
        proof.executionHeader.logsBloom = new bytes(256);
        proof.executionHeader.prevRandao = keccak256("randao");
        proof.executionHeader.blockNumber = 123;
        proof.executionHeader.gasLimit = 30_000_000;
        proof.executionHeader.gasUsed = 1_000_000;
        proof.executionHeader.timestamp = 1_700_000_000;
        proof.executionHeader.extraData = hex"1234";
        proof.executionHeader.baseFeePerGas = 1 gwei;
        proof.executionHeader.blockHash = keccak256("block");
        proof.executionHeader.transactionsRoot = keccak256("txs");
        proof.executionHeader.withdrawalsRoot = keccak256("withdrawals");
        proof.executionHeader.blobGasUsed = 0;
        proof.executionHeader.excessBlobGas = 0;
    }
}
