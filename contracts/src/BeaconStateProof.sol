// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "./interfaces/IBeaconStateProof.sol";
import { EIP4788 } from "./lib/EIP4788.sol";
import { SSZ } from "./lib/SSZ.sol";
import { MerkleTrie } from "./lib/MerkleTrie.sol";
import { RLPReader } from "./lib/RLPReader.sol";

contract BeaconStateProof is IBeaconStateProof {
    error InvalidBeaconHeaderRoot(bytes32 expected, bytes32 actual);
    error InvalidExecutionPayloadProof();
    error InvalidAccountProof();
    error InvalidStorageValue();
    error InvalidAccountRlp();
    error StaleProof(uint64 sourceTimestamp, uint256 maxAge, uint256 currentTimestamp);

    address public immutable beaconRoots;

    constructor(address beaconRoots_) {
        beaconRoots = beaconRoots_ == address(0) ? EIP4788.BEACON_ROOTS_ADDRESS : beaconRoots_;
    }

    function verifyStorageSlot(ProofBundle calldata proof, uint256 maxAge)
        external
        view
        override
        returns (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot)
    {
        if (maxAge > 0 && block.timestamp > uint256(proof.executionHeader.timestamp) + maxAge) {
            revert StaleProof(proof.executionHeader.timestamp, maxAge, block.timestamp);
        }

        bytes32 anchorRoot = EIP4788.getBeaconRoot(proof.timestamp, beaconRoots);
        bytes32 headerRoot = SSZ.beaconBlockHeaderRoot(
            proof.slot,
            proof.proposerIndex,
            proof.parentRoot,
            proof.stateRoot,
            proof.bodyRoot
        );

        if (anchorRoot != headerRoot) {
            revert InvalidBeaconHeaderRoot(anchorRoot, headerRoot);
        }

        bytes32 executionHeaderRoot = SSZ.executionPayloadHeaderRoot(proof.executionHeader);
        if (!SSZ.isValidMerkleBranch(executionHeaderRoot, proof.executionPayloadGIndex, proof.executionHeaderProof, proof.bodyRoot)) {
            revert InvalidExecutionPayloadProof();
        }

        bytes memory accountRlp =
            MerkleTrie.get(abi.encodePacked(keccak256(abi.encodePacked(proof.account))), proof.accountProof, proof.executionHeader.stateRoot);
        bytes32 storageRoot = _extractStorageRoot(accountRlp);
        bytes memory storageRlp =
            MerkleTrie.get(abi.encodePacked(keccak256(abi.encode(proof.slotKey))), proof.storageProof, storageRoot);

        verifiedValue = _decodeStorageValue(storageRlp);
        sourceBlockNumber = proof.executionHeader.blockNumber;
        sourceAccount = proof.account;
        sourceSlot = proof.slotKey;
    }

    function _extractStorageRoot(bytes memory accountRlp) internal pure returns (bytes32 storageRoot) {
        RLPReader.RLPItem[] memory accountFields = RLPReader.readList(accountRlp);
        if (accountFields.length != 4) {
            revert InvalidAccountRlp();
        }

        storageRoot = _toBytes32(RLPReader.readBytes(accountFields[2]));
        if (storageRoot == bytes32(0)) {
            revert InvalidAccountProof();
        }
    }

    function _decodeStorageValue(bytes memory storageRlp) internal pure returns (bytes32 value) {
        bytes memory raw = RLPReader.readBytes(storageRlp);
        if (raw.length > 32) {
            revert InvalidStorageValue();
        }
        value = _toBytes32(raw);
    }

    function _toBytes32(bytes memory raw) internal pure returns (bytes32 value) {
        if (raw.length == 0) {
            return bytes32(0);
        }
        if (raw.length > 32) {
            revert InvalidStorageValue();
        }

        uint256 acc;
        for (uint256 i = 0; i < raw.length; i++) {
            acc = (acc << 8) | uint8(raw[i]);
        }
        value = bytes32(acc);
    }
}
