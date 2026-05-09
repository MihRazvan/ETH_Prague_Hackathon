// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Bytes } from "./Bytes.sol";
import { RLPReader } from "./RLPReader.sol";

library MerkleTrie {
    struct TrieNode {
        bytes encoded;
        RLPReader.RLPItem[] decoded;
    }

    uint256 internal constant TREE_RADIX = 16;
    uint256 internal constant BRANCH_NODE_LENGTH = TREE_RADIX + 1;
    uint256 internal constant LEAF_OR_EXTENSION_NODE_LENGTH = 2;
    uint8 internal constant PREFIX_EXTENSION_EVEN = 0;
    uint8 internal constant PREFIX_EXTENSION_ODD = 1;
    uint8 internal constant PREFIX_LEAF_EVEN = 2;
    uint8 internal constant PREFIX_LEAF_ODD = 3;

    function verifyInclusionProof(bytes memory key, bytes memory value, bytes[] memory proof, bytes32 root)
        internal
        pure
        returns (bool valid)
    {
        valid = Bytes.equal(value, get(key, proof, root));
    }

    function get(bytes memory key, bytes[] memory proofBytes, bytes32 root)
        internal
        pure
        returns (bytes memory value)
    {
        require(key.length > 0, "MerkleTrie: empty key");

        TrieNode[] memory proof = _parseProof(proofBytes);
        bytes memory nibbleKey = Bytes.toNibbles(key);
        bytes memory currentNodeID = abi.encodePacked(root);
        uint256 currentKeyIndex;

        for (uint256 i = 0; i < proof.length; i++) {
            TrieNode memory currentNode = proof[i];
            require(currentKeyIndex <= nibbleKey.length, "MerkleTrie: key index too large");

            if (currentKeyIndex == 0) {
                require(
                    Bytes.equal(abi.encodePacked(keccak256(currentNode.encoded)), currentNodeID),
                    "MerkleTrie: invalid root hash"
                );
            } else if (currentNode.encoded.length >= 32) {
                require(
                    Bytes.equal(abi.encodePacked(keccak256(currentNode.encoded)), currentNodeID),
                    "MerkleTrie: invalid large internal hash"
                );
            } else {
                require(Bytes.equal(currentNode.encoded, currentNodeID), "MerkleTrie: invalid internal hash");
            }

            if (currentNode.decoded.length == BRANCH_NODE_LENGTH) {
                if (currentKeyIndex == nibbleKey.length) {
                    value = RLPReader.readBytes(currentNode.decoded[TREE_RADIX]);
                    require(value.length > 0, "MerkleTrie: empty branch value");
                    require(i == proof.length - 1, "MerkleTrie: branch not terminal");
                    return value;
                }

                uint8 branchKey = uint8(nibbleKey[currentKeyIndex]);
                currentNodeID = _getNodeID(currentNode.decoded[branchKey]);
                currentKeyIndex += 1;
            } else if (currentNode.decoded.length == LEAF_OR_EXTENSION_NODE_LENGTH) {
                bytes memory path = _getNodePath(currentNode);
                uint8 prefix = uint8(path[0]);
                uint8 offset = 2 - (prefix % 2);
                bytes memory pathRemainder = Bytes.slice(path, offset);
                bytes memory keyRemainder = Bytes.slice(nibbleKey, currentKeyIndex);
                uint256 sharedNibbleLength = _getSharedNibbleLength(pathRemainder, keyRemainder);

                require(
                    pathRemainder.length == sharedNibbleLength,
                    "MerkleTrie: path/key mismatch"
                );

                if (prefix == PREFIX_LEAF_EVEN || prefix == PREFIX_LEAF_ODD) {
                    require(
                        keyRemainder.length == sharedNibbleLength,
                        "MerkleTrie: leaf mismatch"
                    );
                    value = RLPReader.readBytes(currentNode.decoded[1]);
                    require(value.length > 0, "MerkleTrie: empty leaf value");
                    require(i == proof.length - 1, "MerkleTrie: leaf not terminal");
                    return value;
                }

                if (prefix == PREFIX_EXTENSION_EVEN || prefix == PREFIX_EXTENSION_ODD) {
                    currentNodeID = _getNodeID(currentNode.decoded[1]);
                    currentKeyIndex += sharedNibbleLength;
                } else {
                    revert("MerkleTrie: unknown prefix");
                }
            } else {
                revert("MerkleTrie: unparseable node");
            }
        }

        revert("MerkleTrie: proof exhausted");
    }

    function _parseProof(bytes[] memory proofBytes) private pure returns (TrieNode[] memory proof) {
        proof = new TrieNode[](proofBytes.length);
        for (uint256 i = 0; i < proofBytes.length; i++) {
            proof[i] = TrieNode({ encoded: proofBytes[i], decoded: RLPReader.readList(proofBytes[i]) });
        }
    }

    function _getNodeID(RLPReader.RLPItem memory node) private pure returns (bytes memory id) {
        id = node.length < 32 ? RLPReader.readRawBytes(node) : RLPReader.readBytes(node);
    }

    function _getNodePath(TrieNode memory node) private pure returns (bytes memory nibbles) {
        nibbles = Bytes.toNibbles(RLPReader.readBytes(node.decoded[0]));
    }

    function _getSharedNibbleLength(bytes memory a, bytes memory b) private pure returns (uint256 shared) {
        uint256 max = a.length < b.length ? a.length : b.length;
        while (shared < max && a[shared] == b[shared]) {
            unchecked {
                ++shared;
            }
        }
    }
}
