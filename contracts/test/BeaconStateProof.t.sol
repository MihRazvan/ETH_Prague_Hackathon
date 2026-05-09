// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { BeaconStateProof } from "../src/BeaconStateProof.sol";
import { IBeaconStateProof } from "../src/interfaces/IBeaconStateProof.sol";
import { SSZ } from "../src/lib/SSZ.sol";
import { MockBeaconRoots } from "./mocks/MockBeaconRoots.sol";

contract BeaconStateProofTest is Test {
    using stdJson for string;

    struct ExpectedResult {
        bytes32 verifiedValue;
        uint64 sourceBlockNumber;
        address sourceAccount;
        bytes32 sourceSlot;
    }

    BeaconStateProof internal verifier;
    MockBeaconRoots internal beaconRoots;
    IBeaconStateProof.ProofBundle internal fixtureProof;
    ExpectedResult internal fixtureExpected;

    function setUp() external {
        beaconRoots = new MockBeaconRoots();
        verifier = new BeaconStateProof(address(beaconRoots));
        (fixtureProof, fixtureExpected) = _loadFixture();
    }

    function test_verifiesRealFixtureProof() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);

        (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot) =
            verifier.verifyStorageSlot(proof, 0);

        assertEq(verifiedValue, fixtureExpected.verifiedValue);
        assertEq(sourceBlockNumber, fixtureExpected.sourceBlockNumber);
        assertEq(sourceAccount, fixtureExpected.sourceAccount);
        assertEq(sourceSlot, fixtureExpected.sourceSlot);
    }

    function test_revertsForStaleProof() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        vm.warp(proof.executionHeader.timestamp + 2 hours);

        vm.expectRevert(
            abi.encodeWithSelector(BeaconStateProof.StaleProof.selector, proof.executionHeader.timestamp, 1 hours, block.timestamp)
        );
        verifier.verifyStorageSlot(proof, 1 hours);
    }

    function test_revertsForMismatchedBeaconHeaderRoot() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        beaconRoots.setRoot(proof.timestamp, keccak256("wrong-root"));

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForInvalidExecutionPayloadProof() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);

        vm.expectRevert(BeaconStateProof.InvalidExecutionPayloadProof.selector);
        proof.executionHeaderProof[0] = bytes32(uint256(proof.executionHeaderProof[0]) ^ uint256(1));
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForInvalidLogsBloomLength() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.executionHeader.logsBloom = new bytes(255);

        vm.expectRevert(abi.encodeWithSelector(SSZ.InvalidLogsBloomLength.selector, 255));
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForExtraDataTooLong() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.executionHeader.extraData = new bytes(33);

        vm.expectRevert(abi.encodeWithSelector(SSZ.ExtraDataTooLong.selector, 33));
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForTamperedAccountTarget() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.account = address(0x1234);

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForTamperedStorageSlotKey() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.slotKey = bytes32(uint256(proof.slotKey) ^ uint256(1));

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForEmptyAccountProof() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.accountProof = new bytes[](0);

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function test_revertsForEmptyStorageProof() external {
        IBeaconStateProof.ProofBundle memory proof = fixtureProof;
        _setAnchorRoot(proof);
        proof.storageProof = new bytes[](0);

        vm.expectRevert();
        verifier.verifyStorageSlot(proof, 0);
    }

    function _setAnchorRoot(IBeaconStateProof.ProofBundle memory proof) internal {
        bytes32 headerRoot =
            SSZ.beaconBlockHeaderRoot(proof.slot, proof.proposerIndex, proof.parentRoot, proof.stateRoot, proof.bodyRoot);
        beaconRoots.setRoot(proof.timestamp, headerRoot);
    }

    function _loadFixture()
        internal
        view
        returns (IBeaconStateProof.ProofBundle memory proof, ExpectedResult memory expected)
    {
        string memory path = string.concat(vm.projectRoot(), "/test/fixtures/liveProofFixture.json");
        string memory json = vm.readFile(path);

        proof.timestamp = _readUint64(json, ".bundle.timestamp");
        proof.slot = _readUint64(json, ".bundle.slot");
        proof.proposerIndex = _readUint64(json, ".bundle.proposerIndex");
        proof.parentRoot = json.readBytes32(".bundle.parentRoot");
        proof.stateRoot = json.readBytes32(".bundle.stateRoot");
        proof.bodyRoot = json.readBytes32(".bundle.bodyRoot");
        proof.executionPayloadGIndex = _readUint(json, ".bundle.executionPayloadGIndex");
        proof.account = json.readAddress(".bundle.account");
        proof.slotKey = json.readBytes32(".bundle.slotKey");
        proof.executionHeaderProof = json.readBytes32Array(".bundle.executionHeaderProof");
        proof.accountProof = json.readBytesArray(".bundle.accountProof");
        proof.storageProof = json.readBytesArray(".bundle.storageProof");

        proof.executionHeader.parentHash = json.readBytes32(".bundle.executionHeader.parentHash");
        proof.executionHeader.feeRecipient = json.readAddress(".bundle.executionHeader.feeRecipient");
        proof.executionHeader.stateRoot = json.readBytes32(".bundle.executionHeader.stateRoot");
        proof.executionHeader.receiptsRoot = json.readBytes32(".bundle.executionHeader.receiptsRoot");
        proof.executionHeader.logsBloom = json.readBytes(".bundle.executionHeader.logsBloom");
        proof.executionHeader.prevRandao = json.readBytes32(".bundle.executionHeader.prevRandao");
        proof.executionHeader.blockNumber = _readUint64(json, ".bundle.executionHeader.blockNumber");
        proof.executionHeader.gasLimit = _readUint64(json, ".bundle.executionHeader.gasLimit");
        proof.executionHeader.gasUsed = _readUint64(json, ".bundle.executionHeader.gasUsed");
        proof.executionHeader.timestamp = _readUint64(json, ".bundle.executionHeader.timestamp");
        proof.executionHeader.extraData = json.readBytes(".bundle.executionHeader.extraData");
        proof.executionHeader.baseFeePerGas = _readUint(json, ".bundle.executionHeader.baseFeePerGas");
        proof.executionHeader.blockHash = json.readBytes32(".bundle.executionHeader.blockHash");
        proof.executionHeader.transactionsRoot = json.readBytes32(".bundle.executionHeader.transactionsRoot");
        proof.executionHeader.withdrawalsRoot = json.readBytes32(".bundle.executionHeader.withdrawalsRoot");
        proof.executionHeader.blobGasUsed = _readUint64(json, ".bundle.executionHeader.blobGasUsed");
        proof.executionHeader.excessBlobGas = _readUint64(json, ".bundle.executionHeader.excessBlobGas");

        expected.verifiedValue = json.readBytes32(".expected.verifiedValue");
        expected.sourceBlockNumber = _readUint64(json, ".expected.sourceBlockNumber");
        expected.sourceAccount = json.readAddress(".expected.sourceAccount");
        expected.sourceSlot = json.readBytes32(".expected.sourceSlot");
    }

    function _readUint64(string memory json, string memory key) internal pure returns (uint64) {
        return uint64(_readUint(json, key));
    }

    function _readUint(string memory json, string memory key) internal pure returns (uint256) {
        return vm.parseUint(json.readString(key));
    }
}
