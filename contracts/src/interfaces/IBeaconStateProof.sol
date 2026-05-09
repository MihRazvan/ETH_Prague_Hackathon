// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBeaconStateProof {
    struct ExecutionPayloadHeader {
        bytes32 parentHash;
        address feeRecipient;
        bytes32 stateRoot;
        bytes32 receiptsRoot;
        bytes logsBloom;
        bytes32 prevRandao;
        uint64 blockNumber;
        uint64 gasLimit;
        uint64 gasUsed;
        uint64 timestamp;
        bytes extraData;
        uint256 baseFeePerGas;
        bytes32 blockHash;
        bytes32 transactionsRoot;
        bytes32 withdrawalsRoot;
        uint64 blobGasUsed;
        uint64 excessBlobGas;
    }

    struct ProofBundle {
        uint64 timestamp;
        uint64 slot;
        uint64 proposerIndex;
        bytes32 parentRoot;
        bytes32 stateRoot;
        bytes32 bodyRoot;
        uint256 executionPayloadGIndex;
        ExecutionPayloadHeader executionHeader;
        bytes32[] executionHeaderProof;
        address account;
        bytes32 slotKey;
        bytes[] accountProof;
        bytes[] storageProof;
    }

    function verifyStorageSlot(ProofBundle calldata proof, uint256 maxAge)
        external
        view
        returns (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot);
}
