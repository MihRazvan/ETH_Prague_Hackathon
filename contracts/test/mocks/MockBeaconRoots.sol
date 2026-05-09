// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockBeaconRoots {
    mapping(uint64 => bytes32) public roots;

    function setRoot(uint64 timestamp, bytes32 root) external {
        roots[timestamp] = root;
    }

    fallback(bytes calldata input) external returns (bytes memory) {
        require(input.length == 32, "MockBeaconRoots: bad input");
        uint64 timestamp = uint64(uint256(bytes32(input)));
        return abi.encode(roots[timestamp]);
    }
}
