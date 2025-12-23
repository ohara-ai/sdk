// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title ArrayLib
 * @notice Utility library for common array operations
 * @dev Gas-optimized array manipulation functions
 */
library ArrayLib {
    /**
     * @notice Remove element at index using swap-and-pop (O(1) but doesn't preserve order)
     * @param arr The storage array to modify
     * @param index The index to remove
     */
    function swapAndPop(address[] storage arr, uint256 index) internal {
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }

    /**
     * @notice Remove element at index using swap-and-pop for uint256 arrays
     * @param arr The storage array to modify
     * @param index The index to remove
     */
    function swapAndPopUint(uint256[] storage arr, uint256 index) internal {
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }

    /**
     * @notice Shift elements left to remove at index (O(n) but preserves order)
     * @param arr The storage array to modify
     * @param index The index to remove
     */
    function shiftAndPop(uint256[] storage arr, uint256 index) internal {
        uint256 length = arr.length;
        for (uint256 i = index; i < length - 1;) {
            arr[i] = arr[i + 1];
            unchecked { ++i; }
        }
        arr.pop();
    }

    /**
     * @notice Find and remove an address from array (O(n))
     * @param arr The storage array to modify
     * @param value The address to remove
     * @return found Whether the value was found and removed
     */
    function removeByValue(address[] storage arr, address value) internal returns (bool found) {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length;) {
            if (arr[i] == value) {
                swapAndPop(arr, i);
                return true;
            }
            unchecked { ++i; }
        }
        return false;
    }

    /**
     * @notice Check if array contains a value
     * @param arr The memory array to search
     * @param value The address to find
     * @return exists Whether the value exists in the array
     */
    function contains(address[] memory arr, address value) internal pure returns (bool exists) {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length;) {
            if (arr[i] == value) {
                return true;
            }
            unchecked { ++i; }
        }
        return false;
    }
}
