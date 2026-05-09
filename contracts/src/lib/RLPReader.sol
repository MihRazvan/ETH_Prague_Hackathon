// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    EmptyItem,
    UnexpectedString,
    InvalidDataRemainder,
    ContentLengthMismatch,
    InvalidHeader,
    UnexpectedList
} from "./RLPErrors.sol";

library RLPReader {
    type MemoryPointer is uint256;

    enum RLPItemType {
        DATA_ITEM,
        LIST_ITEM
    }

    struct RLPItem {
        uint256 length;
        MemoryPointer ptr;
    }

    uint256 internal constant MAX_LIST_LENGTH = 32;

    function toRLPItem(bytes memory input) internal pure returns (RLPItem memory output) {
        if (input.length == 0) revert EmptyItem();

        MemoryPointer ptr;
        assembly {
            ptr := add(input, 32)
        }

        output = RLPItem({ length: input.length, ptr: ptr });
    }

    function readList(RLPItem memory input) internal pure returns (RLPItem[] memory output) {
        (uint256 listOffset, uint256 listLength, RLPItemType itemType) = _decodeLength(input);
        if (itemType != RLPItemType.LIST_ITEM) revert UnexpectedString();
        if (listOffset + listLength != input.length) revert InvalidDataRemainder();

        output = new RLPItem[](MAX_LIST_LENGTH);
        uint256 itemCount;
        uint256 offset = listOffset;

        while (offset < input.length) {
            (uint256 itemOffset, uint256 itemLength,) = _decodeLength(
                RLPItem({
                    length: input.length - offset,
                    ptr: MemoryPointer.wrap(MemoryPointer.unwrap(input.ptr) + offset)
                })
            );

            output[itemCount] = RLPItem({
                length: itemLength + itemOffset,
                ptr: MemoryPointer.wrap(MemoryPointer.unwrap(input.ptr) + offset)
            });

            itemCount += 1;
            offset += itemOffset + itemLength;
        }

        assembly {
            mstore(output, itemCount)
        }
    }

    function readList(bytes memory input) internal pure returns (RLPItem[] memory output) {
        output = readList(toRLPItem(input));
    }

    function readBytes(RLPItem memory input) internal pure returns (bytes memory output) {
        (uint256 itemOffset, uint256 itemLength, RLPItemType itemType) = _decodeLength(input);
        if (itemType != RLPItemType.DATA_ITEM) revert UnexpectedList();
        if (input.length != itemOffset + itemLength) revert InvalidDataRemainder();
        output = _copy(input.ptr, itemOffset, itemLength);
    }

    function readBytes(bytes memory input) internal pure returns (bytes memory output) {
        output = readBytes(toRLPItem(input));
    }

    function readRawBytes(RLPItem memory input) internal pure returns (bytes memory output) {
        output = _copy(input.ptr, 0, input.length);
    }

    function _decodeLength(RLPItem memory input)
        private
        pure
        returns (uint256 offset, uint256 length, RLPItemType itemType)
    {
        if (input.length == 0) revert EmptyItem();

        MemoryPointer ptr = input.ptr;
        uint256 prefix;
        assembly {
            prefix := byte(0, mload(ptr))
        }

        if (prefix <= 0x7f) {
            return (0, 1, RLPItemType.DATA_ITEM);
        } else if (prefix <= 0xb7) {
            uint256 strLen = prefix - 0x80;
            if (input.length <= strLen) revert ContentLengthMismatch();

            bytes1 firstByteOfContent;
            assembly {
                firstByteOfContent := and(mload(add(ptr, 1)), shl(248, 0xff))
            }

            if (strLen == 1 && firstByteOfContent < 0x80) revert InvalidHeader();
            return (1, strLen, RLPItemType.DATA_ITEM);
        } else if (prefix <= 0xbf) {
            uint256 lenOfStrLen = prefix - 0xb7;
            if (input.length <= lenOfStrLen) revert ContentLengthMismatch();

            bytes1 firstByteOfContent;
            assembly {
                firstByteOfContent := and(mload(add(ptr, 1)), shl(248, 0xff))
            }

            if (firstByteOfContent == 0x00) revert InvalidHeader();

            uint256 strLen;
            assembly {
                strLen := shr(sub(256, mul(8, lenOfStrLen)), mload(add(ptr, 1)))
            }

            if (strLen <= 55) revert InvalidHeader();
            if (input.length <= lenOfStrLen + strLen) revert ContentLengthMismatch();
            return (1 + lenOfStrLen, strLen, RLPItemType.DATA_ITEM);
        } else if (prefix <= 0xf7) {
            uint256 listLen = prefix - 0xc0;
            if (input.length <= listLen) revert ContentLengthMismatch();
            return (1, listLen, RLPItemType.LIST_ITEM);
        } else {
            uint256 lenOfListLen = prefix - 0xf7;
            if (input.length <= lenOfListLen) revert ContentLengthMismatch();

            bytes1 firstByteOfContent;
            assembly {
                firstByteOfContent := and(mload(add(ptr, 1)), shl(248, 0xff))
            }

            if (firstByteOfContent == 0x00) revert InvalidHeader();

            uint256 listLen;
            assembly {
                listLen := shr(sub(256, mul(8, lenOfListLen)), mload(add(ptr, 1)))
            }

            if (listLen <= 55) revert InvalidHeader();
            if (input.length <= lenOfListLen + listLen) revert ContentLengthMismatch();
            return (1 + lenOfListLen, listLen, RLPItemType.LIST_ITEM);
        }
    }

    function _copy(MemoryPointer src, uint256 offset, uint256 length) private pure returns (bytes memory output) {
        output = new bytes(length);
        if (length == 0) {
            return output;
        }

        uint256 source = MemoryPointer.unwrap(src) + offset;
        assembly {
            let dest := add(output, 32)
            let i := 0
            for {} lt(i, length) { i := add(i, 32) } {
                mstore(add(dest, i), mload(add(source, i)))
            }

            if gt(i, length) {
                mstore(add(dest, length), 0)
            }
        }
    }
}
