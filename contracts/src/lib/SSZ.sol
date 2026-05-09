// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "../interfaces/IBeaconStateProof.sol";

library SSZ {
    error InvalidLogsBloomLength(uint256 actualLength);
    error ExtraDataTooLong(uint256 actualLength);
    error InvalidGeneralizedIndex(uint256 index, uint256 depth);

    function toLittleEndian(uint256 value) internal pure returns (bytes32) {
        value = ((value & 0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >> 8)
            | ((value & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) << 8);
        value = ((value & 0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >> 16)
            | ((value & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) << 16);
        value = ((value & 0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >> 32)
            | ((value & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) << 32);
        value = ((value & 0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >> 64)
            | ((value & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) << 64);
        value = (value >> 128) | (value << 128);
        return bytes32(value);
    }

    function restoreMerkleRoot(bytes32 leaf, uint256 index, bytes32[] memory branch)
        internal
        pure
        returns (bytes32 value)
    {
        if ((2 ** branch.length) > index || index == 0) {
            revert InvalidGeneralizedIndex(index, branch.length);
        }

        value = leaf;
        uint256 cursor = index;
        for (uint256 i = 0; i < branch.length; i++) {
            if (cursor % 2 == 1) {
                value = sha256(bytes.concat(branch[i], value));
            } else {
                value = sha256(bytes.concat(value, branch[i]));
            }
            cursor /= 2;
        }

        if (cursor != 1) {
            revert InvalidGeneralizedIndex(index, branch.length);
        }
    }

    function isValidMerkleBranch(bytes32 leaf, uint256 index, bytes32[] memory branch, bytes32 root)
        internal
        pure
        returns (bool)
    {
        return restoreMerkleRoot(leaf, index, branch) == root;
    }

    function beaconBlockHeaderRoot(
        uint64 slot,
        uint64 proposerIndex,
        bytes32 parentRoot,
        bytes32 stateRoot,
        bytes32 bodyRoot
    ) internal pure returns (bytes32) {
        bytes32 left = sha256(
            bytes.concat(
                sha256(bytes.concat(toLittleEndian(slot), toLittleEndian(proposerIndex))),
                sha256(bytes.concat(parentRoot, stateRoot))
            )
        );

        bytes32 right = sha256(
            bytes.concat(
                sha256(bytes.concat(bodyRoot, bytes32(0))),
                sha256(bytes.concat(bytes32(0), bytes32(0)))
            )
        );

        return sha256(bytes.concat(left, right));
    }

    function executionPayloadHeaderRoot(IBeaconStateProof.ExecutionPayloadHeader calldata header)
        internal
        pure
        returns (bytes32)
    {
        if (header.logsBloom.length != 256) {
            revert InvalidLogsBloomLength(header.logsBloom.length);
        }
        if (header.extraData.length > 32) {
            revert ExtraDataTooLong(header.extraData.length);
        }

        bytes32[] memory leaves = new bytes32[](17);
        leaves[0] = header.parentHash;
        leaves[1] = _addressToChunk(header.feeRecipient);
        leaves[2] = header.stateRoot;
        leaves[3] = header.receiptsRoot;
        leaves[4] = _hashTreeRootByteVector(header.logsBloom);
        leaves[5] = header.prevRandao;
        leaves[6] = toLittleEndian(header.blockNumber);
        leaves[7] = toLittleEndian(header.gasLimit);
        leaves[8] = toLittleEndian(header.gasUsed);
        leaves[9] = toLittleEndian(header.timestamp);
        leaves[10] = _hashTreeRootByteList32(header.extraData);
        leaves[11] = toLittleEndian(header.baseFeePerGas);
        leaves[12] = header.blockHash;
        leaves[13] = header.transactionsRoot;
        leaves[14] = header.withdrawalsRoot;
        leaves[15] = toLittleEndian(header.blobGasUsed);
        leaves[16] = toLittleEndian(header.excessBlobGas);
        return _merkleize(leaves);
    }

    function _addressToChunk(address account) private pure returns (bytes32) {
        return bytes32(uint256(uint160(account)) << 96);
    }

    function _hashTreeRootByteVector(bytes calldata data) private pure returns (bytes32) {
        bytes32[] memory chunks = new bytes32[](8);
        for (uint256 i = 0; i < 8; i++) {
            chunks[i] = _toChunk(data, i * 32);
        }
        return _merkleize(chunks);
    }

    function _hashTreeRootByteList32(bytes calldata data) private pure returns (bytes32) {
        bytes32 chunk = _toChunk(data, 0);
        return sha256(bytes.concat(chunk, toLittleEndian(data.length)));
    }

    function _toChunk(bytes calldata data, uint256 offset) private pure returns (bytes32 chunk) {
        uint256 available = data.length > offset ? data.length - offset : 0;
        uint256 length = available > 32 ? 32 : available;
        if (length == 0) {
            return bytes32(0);
        }

        bytes memory temp = new bytes(32);
        for (uint256 i = 0; i < length; i++) {
            temp[i] = data[offset + i];
        }

        assembly {
            chunk := mload(add(temp, 32))
        }
    }

    function _merkleize(bytes32[] memory leaves) private pure returns (bytes32) {
        if (leaves.length == 0) {
            return bytes32(0);
        }

        uint256 width = 1;
        while (width < leaves.length) {
            width <<= 1;
        }

        bytes32[] memory tree = new bytes32[](width);
        for (uint256 i = 0; i < leaves.length; i++) {
            tree[i] = leaves[i];
        }

        while (width > 1) {
            uint256 parentWidth = width / 2;
            for (uint256 i = 0; i < parentWidth; i++) {
                tree[i] = sha256(bytes.concat(tree[2 * i], tree[2 * i + 1]));
            }
            width = parentWidth;
        }

        return tree[0];
    }
}
