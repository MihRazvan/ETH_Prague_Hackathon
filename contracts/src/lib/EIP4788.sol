// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library EIP4788 {
    error BeaconRootLookupFailed(uint64 timestamp);

    address internal constant BEACON_ROOTS_ADDRESS = 0x000F3df6D732807Ef1319fB7B8bB8522d0Beac02;

    function getBeaconRoot(uint64 timestamp) internal view returns (bytes32 root) {
        root = getBeaconRoot(timestamp, BEACON_ROOTS_ADDRESS);
    }

    function getBeaconRoot(uint64 timestamp, address beaconRootsAddress) internal view returns (bytes32 root) {
        (bool ok, bytes memory data) = beaconRootsAddress.staticcall(abi.encode(bytes32(uint256(timestamp))));
        if (!ok || data.length != 32) {
            revert BeaconRootLookupFailed(timestamp);
        }

        root = abi.decode(data, (bytes32));
    }
}
