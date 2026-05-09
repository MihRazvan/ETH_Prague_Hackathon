// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Lender } from "../src/demo/Lender.sol";
import { MockUSDC } from "../src/demo/MockUSDC.sol";
import { MockBeaconStateProof } from "./mocks/MockBeaconStateProof.sol";
import { IBeaconStateProof } from "../src/interfaces/IBeaconStateProof.sol";

contract LenderTest is Test {
    MockBeaconStateProof internal mockVerifier;
    Lender internal lender;

    address internal borrower = address(0xBEEF);
    address internal vault = address(0xA117);

    function setUp() external {
        mockVerifier = new MockBeaconStateProof();
        lender = new Lender(address(mockVerifier), vault, 5_000, 1 hours);
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

    function _emptyProof() internal pure returns (IBeaconStateProof.ProofBundle memory proof) {
        proof.executionHeader.logsBloom = new bytes(256);
        return proof;
    }
}
