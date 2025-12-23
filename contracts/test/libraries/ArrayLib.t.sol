// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {ArrayLib} from "../../src/libraries/ArrayLib.sol";

// Helper contract to test library reverts
contract ArrayLibWrapper {
    using ArrayLib for address[];
    
    address[] public addressArray;
    uint256[] public uintArray;
    
    function swapAndPopAddress(uint256 index) external {
        addressArray.swapAndPop(index);
    }
    
    function swapAndPopUint(uint256 index) external {
        ArrayLib.swapAndPopUint(uintArray, index);
    }
    
    function shiftAndPopUint(uint256 index) external {
        ArrayLib.shiftAndPop(uintArray, index);
    }
    
    function pushAddress(address addr) external {
        addressArray.push(addr);
    }
    
    function pushUint(uint256 val) external {
        uintArray.push(val);
    }
    
    function getAddressArrayLength() external view returns (uint256) {
        return addressArray.length;
    }
    
    function getUintArrayLength() external view returns (uint256) {
        return uintArray.length;
    }
}

contract ArrayLibTest is Test {
    using ArrayLib for address[];
    
    address[] public addressArray;
    uint256[] public uintArray;
    ArrayLibWrapper public wrapper;
    
    function setUp() public {
        // Reset arrays
        delete addressArray;
        delete uintArray;
        wrapper = new ArrayLibWrapper();
    }
    
    // ============ swapAndPop Tests ============
    
    function test_SwapAndPop_Address_SingleElement() public {
        addressArray.push(address(0x1));
        
        addressArray.swapAndPop(0);
        
        assertEq(addressArray.length, 0);
    }
    
    function test_SwapAndPop_Address_LastElement() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        addressArray.push(address(0x3));
        
        addressArray.swapAndPop(2);
        
        assertEq(addressArray.length, 2);
        assertEq(addressArray[0], address(0x1));
        assertEq(addressArray[1], address(0x2));
    }
    
    function test_SwapAndPop_Address_MiddleElement() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        addressArray.push(address(0x3));
        
        addressArray.swapAndPop(1);
        
        assertEq(addressArray.length, 2);
        assertEq(addressArray[0], address(0x1));
        assertEq(addressArray[1], address(0x3)); // Last element moved to index 1
    }
    
    function test_SwapAndPopUint_MiddleElement() public {
        uintArray.push(100);
        uintArray.push(200);
        uintArray.push(300);
        
        ArrayLib.swapAndPopUint(uintArray, 1);
        
        assertEq(uintArray.length, 2);
        assertEq(uintArray[0], 100);
        assertEq(uintArray[1], 300);
    }
    
    // ============ shiftAndPop Tests (uint256 only) ============
    
    function test_ShiftAndPop_Uint_SingleElement() public {
        uintArray.push(100);
        
        ArrayLib.shiftAndPop(uintArray, 0);
        
        assertEq(uintArray.length, 0);
    }
    
    function test_ShiftAndPop_Uint_FirstElement() public {
        uintArray.push(100);
        uintArray.push(200);
        uintArray.push(300);
        
        ArrayLib.shiftAndPop(uintArray, 0);
        
        assertEq(uintArray.length, 2);
        assertEq(uintArray[0], 200);
        assertEq(uintArray[1], 300);
    }
    
    function test_ShiftAndPop_Uint_MiddleElement() public {
        uintArray.push(100);
        uintArray.push(200);
        uintArray.push(300);
        
        ArrayLib.shiftAndPop(uintArray, 1);
        
        assertEq(uintArray.length, 2);
        assertEq(uintArray[0], 100);
        assertEq(uintArray[1], 300);
    }
    
    function test_ShiftAndPop_Uint_PreservesOrder() public {
        uintArray.push(100);
        uintArray.push(200);
        uintArray.push(300);
        uintArray.push(400);
        
        ArrayLib.shiftAndPop(uintArray, 1);
        
        assertEq(uintArray.length, 3);
        assertEq(uintArray[0], 100);
        assertEq(uintArray[1], 300);
        assertEq(uintArray[2], 400);
    }
    
    // ============ removeByValue Tests ============
    
    function test_RemoveByValue_Address_Found() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        addressArray.push(address(0x3));
        
        bool removed = addressArray.removeByValue(address(0x2));
        
        assertTrue(removed);
        assertEq(addressArray.length, 2);
    }
    
    function test_RemoveByValue_Address_NotFound() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        
        bool removed = addressArray.removeByValue(address(0x99));
        
        assertFalse(removed);
        assertEq(addressArray.length, 2);
    }
    
    // Note: removeByValue is only implemented for address[] in ArrayLib
    
    // ============ contains Tests ============
    
    function test_Contains_Address_Found() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        addressArray.push(address(0x3));
        
        assertTrue(addressArray.contains(address(0x2)));
    }
    
    function test_Contains_Address_NotFound() public {
        addressArray.push(address(0x1));
        addressArray.push(address(0x2));
        
        assertFalse(addressArray.contains(address(0x99)));
    }
    
    function test_Contains_Address_EmptyArray() public view {
        assertFalse(addressArray.contains(address(0x1)));
    }
    
    // Note: contains is only implemented for address[] in ArrayLib
    
    // ============ Edge Cases (using wrapper for proper revert testing) ============
    
    function test_SwapAndPop_EmptyArray_Reverts() public {
        vm.expectRevert();
        wrapper.swapAndPopAddress(0);
    }
    
    function test_SwapAndPop_OutOfBounds_Reverts() public {
        wrapper.pushAddress(address(0x1));
        
        vm.expectRevert();
        wrapper.swapAndPopAddress(5);
    }
    
    function test_ShiftAndPop_Uint_EmptyArray_Reverts() public {
        vm.expectRevert();
        wrapper.shiftAndPopUint(0);
    }
}
