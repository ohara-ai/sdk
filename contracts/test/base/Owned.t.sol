// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Match} from "../../src/features/game/Match.sol";
import {MatchFactory} from "../../src/factories/game/MatchFactory.sol";

contract OwnedTest is Test {
    MatchFactory public factory;
    Match public gameMatch;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public newOwner = address(0x3);
    address public unauthorizedUser = address(0x4);

    function setUp() public {
        vm.startPrank(owner);
        factory = new MatchFactory();
        
        vm.startPrank(controller);
        address instance = factory.deployMatch(address(0));
        gameMatch = Match(instance);
        vm.stopPrank();
    }

    function test_InitialOwner() public view {
        assertEq(gameMatch.owner(), owner);
        assertEq(gameMatch.pendingOwner(), address(0));
    }

    function test_TransferOwnership_TwoStepProcess() public {
        vm.startPrank(owner);
        
        // Step 1: Initiate transfer
        vm.expectEmit(true, true, false, true);
        emit OwnershipTransferInitiated(owner, newOwner);
        gameMatch.transferOwnership(newOwner);
        
        // Owner should still be the same
        assertEq(gameMatch.owner(), owner);
        assertEq(gameMatch.pendingOwner(), newOwner);
        
        vm.stopPrank();
        
        // Step 2: New owner accepts
        vm.startPrank(newOwner);
        
        vm.expectEmit(true, true, false, true);
        emit OwnershipTransferred(owner, newOwner);
        gameMatch.acceptOwnership();
        
        // Ownership should be transferred
        assertEq(gameMatch.owner(), newOwner);
        assertEq(gameMatch.pendingOwner(), address(0));
        
        vm.stopPrank();
    }

    function test_TransferOwnership_RevertZeroAddress() public {
        vm.startPrank(owner);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidOwner()"));
        gameMatch.transferOwnership(address(0));
        
        vm.stopPrank();
    }

    function test_TransferOwnership_RevertSameOwner() public {
        vm.startPrank(owner);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidOwner()"));
        gameMatch.transferOwnership(owner);
        
        vm.stopPrank();
    }

    function test_TransferOwnership_OnlyOwner() public {
        vm.startPrank(unauthorizedUser);
        
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.transferOwnership(newOwner);
        
        vm.stopPrank();
    }

    function test_AcceptOwnership_OnlyPendingOwner() public {
        vm.startPrank(owner);
        gameMatch.transferOwnership(newOwner);
        vm.stopPrank();
        
        // Unauthorized user cannot accept
        vm.startPrank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.acceptOwnership();
        vm.stopPrank();
        
        // Original owner cannot accept
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.acceptOwnership();
        vm.stopPrank();
        
        // Only pending owner can accept
        vm.startPrank(newOwner);
        gameMatch.acceptOwnership();
        assertEq(gameMatch.owner(), newOwner);
        vm.stopPrank();
    }

    function test_AcceptOwnership_RevertNoPendingOwner() public {
        // Try to accept when no pending owner is set
        vm.startPrank(newOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.acceptOwnership();
        vm.stopPrank();
    }

    function test_TransferOwnership_CanUpdatePendingOwner() public {
        vm.startPrank(owner);
        
        // Set first pending owner
        gameMatch.transferOwnership(newOwner);
        assertEq(gameMatch.pendingOwner(), newOwner);
        
        // Change pending owner before acceptance
        address anotherOwner = address(0x5);
        gameMatch.transferOwnership(anotherOwner);
        assertEq(gameMatch.pendingOwner(), anotherOwner);
        
        vm.stopPrank();
        
        // First pending owner cannot accept
        vm.startPrank(newOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.acceptOwnership();
        vm.stopPrank();
        
        // New pending owner can accept
        vm.startPrank(anotherOwner);
        gameMatch.acceptOwnership();
        assertEq(gameMatch.owner(), anotherOwner);
        vm.stopPrank();
    }

    function test_OnlyOwnerModifier() public {
        // Try to set max active matches as unauthorized user
        vm.startPrank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setMaxActiveMatches(200);
        vm.stopPrank();
        
        // Owner can set it
        vm.startPrank(owner);
        gameMatch.setMaxActiveMatches(200);
        assertEq(gameMatch.maxActiveMatches(), 200);
        vm.stopPrank();
    }

    function test_NewOwnerCanUseOnlyOwnerFunctions() public {
        // Transfer ownership
        vm.startPrank(owner);
        gameMatch.transferOwnership(newOwner);
        vm.stopPrank();
        
        vm.startPrank(newOwner);
        gameMatch.acceptOwnership();
        
        // New owner should be able to use onlyOwner functions
        gameMatch.setMaxActiveMatches(300);
        assertEq(gameMatch.maxActiveMatches(), 300);
        
        vm.stopPrank();
        
        // Original owner should no longer have access
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setMaxActiveMatches(400);
        vm.stopPrank();
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner);
}
