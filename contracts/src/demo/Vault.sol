// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Vault {
    error InvalidLockAmount();
    error LockAlreadyActive();
    error LockNotActive();

    uint8 public constant STATUS_NONE = 0;
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_RELEASED = 2;

    mapping(address => uint256) public locks;

    event Locked(address indexed user, uint256 amount, bytes32 indexed slotKey, uint256 encodedValue);
    event Unlocked(address indexed user, uint256 amount, bytes32 indexed slotKey, uint256 encodedValue);

    function lock() external payable returns (bytes32 slotKey, uint256 encodedValue) {
        if (msg.value == 0) revert InvalidLockAmount();
        if (statusOf(locks[msg.sender]) == STATUS_ACTIVE) revert LockAlreadyActive();

        encodedValue = encodeLock(msg.value, STATUS_ACTIVE);
        locks[msg.sender] = encodedValue;
        slotKey = lockSlot(msg.sender);

        emit Locked(msg.sender, msg.value, slotKey, encodedValue);
    }

    function unlock() external returns (bytes32 slotKey, uint256 encodedValue) {
        uint256 current = locks[msg.sender];
        if (statusOf(current) != STATUS_ACTIVE) revert LockNotActive();

        uint256 amount = amountOf(current);
        encodedValue = encodeLock(amount, STATUS_RELEASED);
        locks[msg.sender] = encodedValue;
        slotKey = lockSlot(msg.sender);

        (bool ok,) = msg.sender.call{ value: amount }("");
        require(ok, "Vault: transfer failed");

        emit Unlocked(msg.sender, amount, slotKey, encodedValue);
    }

    function encodeLock(uint256 amount, uint8 status) public pure returns (uint256 encodedValue) {
        require(amount <= type(uint248).max, "Vault: amount too large");
        encodedValue = (amount << 8) | status;
    }

    function amountOf(uint256 encodedValue) public pure returns (uint256) {
        return encodedValue >> 8;
    }

    function statusOf(uint256 encodedValue) public pure returns (uint8) {
        return uint8(encodedValue);
    }

    function lockSlot(address user) public pure returns (bytes32) {
        return keccak256(abi.encode(user, uint256(0)));
    }
}
