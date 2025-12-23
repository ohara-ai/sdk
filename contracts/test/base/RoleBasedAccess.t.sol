// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {RoleBasedAccess} from "../../src/base/RoleBasedAccess.sol";
import {Owned} from "../../src/base/Owned.sol";

contract TestableRoleBasedAccess is RoleBasedAccess {
    constructor(address _owner) RoleBasedAccess(_owner) {}
    
    function protectedByController() external view onlyRole(CONTROLLER_ROLE) returns (bool) {
        return true;
    }
    
    function protectedByRecorder() external view onlyRole(RECORDER_ROLE) returns (bool) {
        return true;
    }
    
    function protectedByCompetitionManager() external view onlyRole(COMPETITION_MANAGER_ROLE) returns (bool) {
        return true;
    }
}

contract RoleBasedAccessTest is Test {
    TestableRoleBasedAccess public access;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public recorder = address(0x3);
    address public competitionManager = address(0x4);
    address public user = address(0x5);
    
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    
    function setUp() public {
        vm.prank(owner);
        access = new TestableRoleBasedAccess(owner);
    }
    
    function test_InitialState() public view {
        assertEq(access.owner(), owner);
        // Owner has all roles implicitly
        assertTrue(access.hasRole(access.CONTROLLER_ROLE(), owner));
    }
    
    function test_OwnerHasAllRoles() public view {
        assertTrue(access.hasRole(access.CONTROLLER_ROLE(), owner));
        assertTrue(access.hasRole(access.RECORDER_ROLE(), owner));
        assertTrue(access.hasRole(access.COMPETITION_MANAGER_ROLE(), owner));
    }
    
    function test_GrantRole() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(owner);
        access.grantRole(role, controller);
        
        assertTrue(access.hasRole(role, controller));
    }
    
    function test_RevokeRole() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.startPrank(owner);
        access.grantRole(role, controller);
        
        assertTrue(access.hasRole(role, controller));
        
        access.revokeRole(role, controller);
        vm.stopPrank();
        
        assertFalse(access.hasRole(role, controller));
    }
    
    function test_RenounceRole() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(owner);
        access.grantRole(role, controller);
        
        assertTrue(access.hasRole(role, controller));
        
        vm.prank(controller);
        access.renounceRole(role);
        
        assertFalse(access.hasRole(role, controller));
    }
    
    function test_OnlyOwnerCanGrantRoles() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(user);
        vm.expectRevert(Owned.Unauthorized.selector);
        access.grantRole(role, controller);
    }
    
    function test_OnlyOwnerCanRevokeRoles() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(owner);
        access.grantRole(role, controller);
        
        vm.prank(user);
        vm.expectRevert(Owned.Unauthorized.selector);
        access.revokeRole(role, controller);
    }
    
    function test_ControllerRoleRestriction() public {
        bytes32 role = access.CONTROLLER_ROLE();
        
        // User without role should not be able to call protected function
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(RoleBasedAccess.MissingRole.selector, role, user));
        access.protectedByController();
        
        // Grant role
        vm.prank(owner);
        access.grantRole(role, controller);
        
        // Now controller can call
        vm.prank(controller);
        assertTrue(access.protectedByController());
    }
    
    function test_RecorderRoleRestriction() public {
        bytes32 role = access.RECORDER_ROLE();
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(RoleBasedAccess.MissingRole.selector, role, user));
        access.protectedByRecorder();
        
        vm.prank(owner);
        access.grantRole(role, recorder);
        
        vm.prank(recorder);
        assertTrue(access.protectedByRecorder());
    }
    
    function test_CompetitionManagerRoleRestriction() public {
        bytes32 role = access.COMPETITION_MANAGER_ROLE();
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(RoleBasedAccess.MissingRole.selector, role, user));
        access.protectedByCompetitionManager();
        
        vm.prank(owner);
        access.grantRole(role, competitionManager);
        
        vm.prank(competitionManager);
        assertTrue(access.protectedByCompetitionManager());
    }
    
    function test_GetRoleMemberCount() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.startPrank(owner);
        access.grantRole(role, controller);
        access.grantRole(role, recorder);
        access.grantRole(role, competitionManager);
        vm.stopPrank();
        
        assertEq(access.getRoleMemberCount(role), 3);
    }
    
    function test_CannotGrantSameRoleTwice() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.startPrank(owner);
        access.grantRole(role, controller);
        
        vm.expectRevert(RoleBasedAccess.RoleAlreadyGranted.selector);
        access.grantRole(role, controller);
        vm.stopPrank();
    }
    
    function test_CannotRevokeUnheldRole() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(RoleBasedAccess.MissingRole.selector, role, controller));
        access.revokeRole(role, controller);
    }
    
    function test_CannotRenounceUnheldRole() public {
        bytes32 role = access.CONTROLLER_ROLE();
        vm.prank(controller);
        vm.expectRevert(abi.encodeWithSelector(RoleBasedAccess.MissingRole.selector, role, controller));
        access.renounceRole(role);
    }
    
    function test_TransferOwnership() public {
        address newOwner = address(0x999);
        
        // Step 1: Initiate transfer
        vm.prank(owner);
        access.transferOwnership(newOwner);
        
        // Owner should still be the original owner
        assertEq(access.owner(), owner);
        
        // Step 2: Accept transfer
        vm.prank(newOwner);
        access.acceptOwnership();
        
        assertEq(access.owner(), newOwner);
        // New owner has all roles implicitly
        assertTrue(access.hasRole(access.CONTROLLER_ROLE(), newOwner));
    }
}
