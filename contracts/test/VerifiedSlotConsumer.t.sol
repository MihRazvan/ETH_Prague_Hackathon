// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";

import { BeaconStateProof } from "../src/BeaconStateProof.sol";
import { IBeaconStateProof } from "../src/interfaces/IBeaconStateProof.sol";
import { SSZ } from "../src/lib/SSZ.sol";
import { VerifiedSlotConsumer } from "../src/examples/VerifiedSlotConsumer.sol";
import { MockBeaconRoots } from "./mocks/MockBeaconRoots.sol";

contract VerifiedSlotConsumerTest is Test {
    using stdJson for string;

    struct ExpectedResult {
        bytes32 verifiedValue;
        uint64 sourceBlockNumber;
        address sourceAccount;
        bytes32 sourceSlot;
    }

    MockBeaconRoots internal beaconRoots;
    BeaconStateProof internal verifier;
    VerifiedSlotConsumer internal consumer;
    IBeaconStateProof.ProofBundle internal fixtureProof;
    ExpectedResult internal fixtureExpected;

    function setUp() external {
        beaconRoots = new MockBeaconRoots();
        verifier = new BeaconStateProof(address(beaconRoots));
        (fixtureProof, fixtureExpected) = _loadFixture();
        consumer = new VerifiedSlotConsumer(
            address(verifier), fixtureExpected.sourceAccount, fixtureExpected.sourceSlot, 1 hours
        );
    }

    function test_readsVerifiedValueFromRealFixture() external {
        _setAnchorRoot(fixtureProof);
        vm.warp(fixtureProof.executionHeader.timestamp + 5 minutes);

        (bytes32 verifiedValue, uint64 sourceBlockNumber) = consumer.readVerifiedValue(fixtureProof);

        assertEq(verifiedValue, fixtureExpected.verifiedValue);
        assertEq(sourceBlockNumber, fixtureExpected.sourceBlockNumber);
    }

    function test_revertsForWrongSourceAccount() external {
        _setAnchorRoot(fixtureProof);
        VerifiedSlotConsumer wrongConsumer =
            new VerifiedSlotConsumer(address(verifier), address(0xCAFE), fixtureExpected.sourceSlot, 1 hours);

        vm.expectRevert(
            abi.encodeWithSelector(
                VerifiedSlotConsumer.InvalidSourceAccount.selector, address(0xCAFE), fixtureExpected.sourceAccount
            )
        );
        wrongConsumer.readVerifiedValue(fixtureProof);
    }

    function test_revertsForWrongSourceSlot() external {
        _setAnchorRoot(fixtureProof);
        VerifiedSlotConsumer wrongConsumer =
            new VerifiedSlotConsumer(address(verifier), fixtureExpected.sourceAccount, bytes32(uint256(123)), 1 hours);

        vm.expectRevert(
            abi.encodeWithSelector(
                VerifiedSlotConsumer.InvalidSourceSlot.selector, bytes32(uint256(123)), fixtureExpected.sourceSlot
            )
        );
        wrongConsumer.readVerifiedValue(fixtureProof);
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
