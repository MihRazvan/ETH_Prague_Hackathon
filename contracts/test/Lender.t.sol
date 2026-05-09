// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { BeaconStateProof } from "../src/BeaconStateProof.sol";
import { Lender } from "../src/demo/Lender.sol";
import { MockUSDC } from "../src/demo/MockUSDC.sol";
import { SSZ } from "../src/lib/SSZ.sol";
import { MockBeaconStateProof } from "./mocks/MockBeaconStateProof.sol";
import { MockBeaconRoots } from "./mocks/MockBeaconRoots.sol";
import { IBeaconStateProof } from "../src/interfaces/IBeaconStateProof.sol";

contract LenderTest is Test {
    using stdJson for string;

    struct ExpectedResult {
        bytes32 verifiedValue;
        uint64 sourceBlockNumber;
        address sourceAccount;
        bytes32 sourceSlot;
        address borrower;
    }

    MockBeaconStateProof internal mockVerifier;
    MockBeaconRoots internal beaconRoots;
    BeaconStateProof internal verifier;
    Lender internal lender;
    Lender internal fixtureLender;

    address internal borrower = address(0xBEEF);
    address internal vault = address(0xA117);

    function setUp() external {
        mockVerifier = new MockBeaconStateProof();
        lender = new Lender(address(mockVerifier), vault, 5_000, 1 hours);
        beaconRoots = new MockBeaconRoots();
        verifier = new BeaconStateProof(address(beaconRoots));
    }

    function test_borrowRepayAndSettle() external {
        bytes32 slot = keccak256(abi.encode(borrower, uint256(0)));
        uint256 activeValue = (1 ether << 8) | 1;

        mockVerifier.setResult(bytes32(activeValue), 10, vault, slot);

        vm.prank(borrower);
        (uint256 loanId, uint256 debtAmount) = lender.borrow(_emptyProof());

        MockUSDC token = lender.stablecoin();
        assertEq(loanId, 1);
        assertEq(debtAmount, 500_000);
        assertEq(token.balanceOf(borrower), 500_000);

        vm.prank(borrower);
        lender.repay(loanId);
        assertEq(token.balanceOf(borrower), 0);

        uint256 releasedValue = (1 ether << 8) | 2;
        mockVerifier.setResult(bytes32(releasedValue), 11, vault, slot);

        vm.prank(borrower);
        lender.settle(_emptyProof(), loanId);

        (,,,, bool repaid, bool active) = lender.loans(loanId);
        assertTrue(repaid);
        assertFalse(active);
        assertEq(lender.activeLoanIds(borrower), 0);
    }

    function test_borrowWithRealVerifierFixture() external {
        (IBeaconStateProof.ProofBundle memory proof, ExpectedResult memory expected) = _loadFixture();
        _setAnchorRoot(proof);
        fixtureLender = new Lender(address(verifier), expected.sourceAccount, 5_000, 1 hours);

        vm.warp(proof.executionHeader.timestamp + 5 minutes);
        vm.prank(expected.borrower);
        (uint256 loanId, uint256 debtAmount) = fixtureLender.borrow(proof);

        MockUSDC token = fixtureLender.stablecoin();
        assertEq(loanId, 1);
        assertEq(debtAmount, 50_000);
        assertEq(token.balanceOf(expected.borrower), 50_000);

        (address loanBorrower, uint256 collateralWei, uint256 recordedDebt, uint64 sourceBlockNumber, bool repaid, bool active)
            = fixtureLender.loans(loanId);
        assertEq(loanBorrower, expected.borrower);
        assertEq(collateralWei, 0.1 ether);
        assertEq(recordedDebt, 50_000);
        assertEq(sourceBlockNumber, expected.sourceBlockNumber);
        assertFalse(repaid);
        assertTrue(active);
    }

    function test_borrowRevertsForWrongSourceAccount() external {
        bytes32 slot = keccak256(abi.encode(borrower, uint256(0)));
        uint256 activeValue = (1 ether << 8) | 1;
        mockVerifier.setResult(bytes32(activeValue), 10, address(0xCAFE), slot);

        vm.expectRevert(abi.encodeWithSelector(Lender.InvalidSourceAccount.selector, vault, address(0xCAFE)));
        vm.prank(borrower);
        lender.borrow(_emptyProof());
    }

    function test_borrowRevertsForWrongSourceSlot() external {
        uint256 activeValue = (1 ether << 8) | 1;
        mockVerifier.setResult(bytes32(activeValue), 10, vault, bytes32(uint256(123)));

        vm.expectRevert(
            abi.encodeWithSelector(Lender.InvalidSourceSlot.selector, keccak256(abi.encode(borrower, uint256(0))), bytes32(uint256(123)))
        );
        vm.prank(borrower);
        lender.borrow(_emptyProof());
    }

    function test_borrowRevertsForReleasedLockState() external {
        bytes32 slot = keccak256(abi.encode(borrower, uint256(0)));
        uint256 releasedValue = (1 ether << 8) | 2;
        mockVerifier.setResult(bytes32(releasedValue), 10, vault, slot);

        vm.expectRevert(abi.encodeWithSelector(Lender.InvalidLockState.selector, uint8(2)));
        vm.prank(borrower);
        lender.borrow(_emptyProof());
    }

    function test_borrowRevertsForZeroBorrowCapacity() external {
        bytes32 slot = keccak256(abi.encode(borrower, uint256(0)));
        uint256 tinyActiveValue = (1 << 8) | 1;
        mockVerifier.setResult(bytes32(tinyActiveValue), 10, vault, slot);

        vm.expectRevert(Lender.ZeroBorrowCapacity.selector);
        vm.prank(borrower);
        lender.borrow(_emptyProof());
    }

    function test_settleRevertsForInvalidSettlementAmount() external {
        bytes32 slot = keccak256(abi.encode(borrower, uint256(0)));
        uint256 activeValue = (1 ether << 8) | 1;
        mockVerifier.setResult(bytes32(activeValue), 10, vault, slot);

        vm.prank(borrower);
        (uint256 loanId,) = lender.borrow(_emptyProof());

        vm.prank(borrower);
        lender.repay(loanId);

        uint256 releasedWrongAmount = (2 ether << 8) | 2;
        mockVerifier.setResult(bytes32(releasedWrongAmount), 11, vault, slot);

        vm.expectRevert(abi.encodeWithSelector(Lender.InvalidSettlementAmount.selector, 1 ether, 2 ether));
        vm.prank(borrower);
        lender.settle(_emptyProof(), loanId);
    }

    function _emptyProof() internal pure returns (IBeaconStateProof.ProofBundle memory proof) {
        proof.executionHeader.logsBloom = new bytes(256);
        return proof;
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
        expected.borrower = json.readAddress(".metadata.borrower");
    }

    function _readUint64(string memory json, string memory key) internal pure returns (uint64) {
        return uint64(_readUint(json, key));
    }

    function _readUint(string memory json, string memory key) internal pure returns (uint256) {
        return vm.parseUint(json.readString(key));
    }
}
