// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {DevWorldToken} from "../src/tokens/DevWorldToken.sol";

contract DevWorldTokenTest is Test {
    DevWorldToken public token;
    
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 10**18;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    
    function setUp() public {
        vm.prank(owner);
        token = new DevWorldToken(INITIAL_SUPPLY);
    }
    
    function test_InitialState() public view {
        assertEq(token.name(), "DEVWORLD");
        assertEq(token.symbol(), "DEVWORLD");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.owner(), owner);
    }
    
    function test_Transfer() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user1, amount);
        bool success = token.transfer(user1, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
        assertEq(token.balanceOf(user1), amount);
    }
    
    function test_TransferFailsWithInsufficientBalance() public {
        uint256 amount = INITIAL_SUPPLY + 1;
        
        vm.prank(owner);
        vm.expectRevert(DevWorldToken.InsufficientBalance.selector);
        token.transfer(user1, amount);
    }
    
    function test_Approve() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Approval(owner, user1, amount);
        bool success = token.approve(user1, amount);
        
        assertTrue(success);
        assertEq(token.allowance(owner, user1), amount);
    }
    
    function test_TransferFrom() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(owner);
        token.approve(user1, amount);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user2, amount);
        bool success = token.transferFrom(owner, user2, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
        assertEq(token.balanceOf(user2), amount);
        assertEq(token.allowance(owner, user1), 0);
    }
    
    function test_TransferFromFailsWithInsufficientAllowance() public {
        uint256 approvedAmount = 50 * 10**18;
        uint256 transferAmount = 100 * 10**18;
        
        vm.prank(owner);
        token.approve(user1, approvedAmount);
        
        vm.prank(user1);
        vm.expectRevert(DevWorldToken.InsufficientAllowance.selector);
        token.transferFrom(owner, user2, transferAmount);
    }
    
    function test_TransferFromFailsWithInsufficientBalance() public {
        uint256 amount = INITIAL_SUPPLY + 1;
        
        vm.prank(owner);
        token.approve(user1, amount);
        
        vm.prank(user1);
        vm.expectRevert(DevWorldToken.InsufficientBalance.selector);
        token.transferFrom(owner, user2, amount);
    }
    
    function test_Mint() public {
        uint256 mintAmount = 500_000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Mint(user1, mintAmount);
        token.mint(user1, mintAmount);
        
        assertEq(token.totalSupply(), INITIAL_SUPPLY + mintAmount);
        assertEq(token.balanceOf(user1), mintAmount);
    }
    
    function test_MintFailsForNonOwner() public {
        uint256 mintAmount = 100 * 10**18;
        
        vm.prank(user1);
        vm.expectRevert(DevWorldToken.Unauthorized.selector);
        token.mint(user1, mintAmount);
    }
    
    function test_TransferOwnership() public {
        vm.prank(owner);
        token.transferOwnership(user1);
        
        assertEq(token.owner(), user1);
    }
    
    function test_TransferOwnershipFailsForNonOwner() public {
        vm.prank(user1);
        vm.expectRevert(DevWorldToken.Unauthorized.selector);
        token.transferOwnership(user2);
    }
    
    function test_NewOwnerCanMint() public {
        vm.prank(owner);
        token.transferOwnership(user1);
        
        uint256 mintAmount = 100 * 10**18;
        vm.prank(user1);
        token.mint(user2, mintAmount);
        
        assertEq(token.balanceOf(user2), mintAmount);
    }
    
    function test_DeployWithZeroSupply() public {
        vm.prank(owner);
        DevWorldToken newToken = new DevWorldToken(0);
        
        assertEq(newToken.totalSupply(), 0);
        assertEq(newToken.balanceOf(owner), 0);
        assertEq(newToken.owner(), owner);
    }
}
