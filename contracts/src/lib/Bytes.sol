// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library Bytes {
    function slice(bytes memory data, uint256 start, uint256 length) internal pure returns (bytes memory) {
        unchecked {
            require(length + 31 >= length, "slice_overflow");
            require(start + length >= start, "slice_overflow");
            require(data.length >= start + length, "slice_oob");
        }

        bytes memory output;
        assembly {
            switch iszero(length)
            case 0 {
                output := mload(0x40)
                let lengthmod := and(length, 31)
                let mc := add(add(output, lengthmod), mul(0x20, iszero(lengthmod)))
                let end := add(mc, length)
                for {
                    let cc := add(add(add(data, lengthmod), mul(0x20, iszero(lengthmod))), start)
                } lt(mc, end) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } { mstore(mc, mload(cc)) }
                mstore(output, length)
                mstore(0x40, and(add(mc, 31), not(31)))
            }
            default {
                output := mload(0x40)
                mstore(output, 0)
                mstore(0x40, add(output, 0x20))
            }
        }

        return output;
    }

    function slice(bytes memory data, uint256 start) internal pure returns (bytes memory) {
        if (start >= data.length) {
            return bytes("");
        }
        return slice(data, start, data.length - start);
    }

    function toNibbles(bytes memory data) internal pure returns (bytes memory nibbles) {
        assembly {
            nibbles := mload(0x40)
            let dataLength := mload(data)
            let nibblesLength := shl(1, dataLength)
            mstore(0x40, add(nibbles, and(not(0x1f), add(nibblesLength, 0x3f))))
            mstore(nibbles, nibblesLength)
            let dataStart := add(data, 0x20)
            let nibblesStart := add(nibbles, 0x20)
            for { let i := 0 } lt(i, dataLength) { i := add(i, 1) } {
                let offset := add(nibblesStart, shl(1, i))
                let b := byte(0, mload(add(dataStart, i)))
                mstore8(offset, shr(4, b))
                mstore8(add(offset, 1), and(b, 0x0f))
            }
        }
    }

    function equal(bytes memory a, bytes memory b) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }
}
