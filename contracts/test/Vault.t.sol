// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Vault } from "../src/demo/Vault.sol";

contract VaultTest is Test {
    Vault internal vault;
    address internal borrower = address(0xB0B);

    function setUp() external {
        vault = new Vault();
        vm.deal(borrower, 5 ether);
    }

    function test_lockStoresPackedValue() external {
        vm.prank(borrower);
        (bytes32 slotKey, uint256 encoded) = vault.lock{ value: 1 ether }();

        assertEq(slotKey, vault.lockSlot(borrower));
        assertEq(vault.locks(borrower), encoded);
        assertEq(vault.amountOf(encoded), 1 ether);
        assertEq(vault.statusOf(encoded), vault.STATUS_ACTIVE());
    }

    function test_unlockMarksReleasedState() external {
        vm.startPrank(borrower);
        vault.lock{ value: 2 ether }();
        (, uint256 encoded) = vault.unlock();
        vm.stopPrank();

        assertEq(vault.amountOf(encoded), 2 ether);
        assertEq(vault.statusOf(encoded), vault.STATUS_RELEASED());
        assertEq(vault.locks(borrower), encoded);
    }
}
