// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {EventBusFactory} from "../../../src/factories/base/EventBusFactory.sol";
import {EventBus} from "../../../src/base/EventBus.sol";

contract EventBusFactoryTest is Test {
    EventBusFactory public factory;
    
    address public owner = address(0x1);
    address public deployer = address(0x2);
    address public customOwner = address(0x3);
    
    event EventBusDeployed(address indexed instance, address indexed owner);
    
    function setUp() public {
        vm.prank(owner);
        factory = new EventBusFactory();
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), owner);
    }
    
    function test_DeployEventBus() public {
        vm.prank(deployer);
        vm.expectEmit(false, true, false, false);
        emit EventBusDeployed(address(0), owner);
        address instance = factory.deployEventBus();
        
        assertTrue(instance != address(0));
        
        // Verify the deployed EventBus
        EventBus eventBus = EventBus(instance);
        assertEq(eventBus.owner(), owner);
    }
    
    function test_DeployEventBusWithOwner() public {
        vm.prank(deployer);
        vm.expectEmit(false, true, false, false);
        emit EventBusDeployed(address(0), customOwner);
        address instance = factory.deployEventBusWithOwner(customOwner);
        
        assertTrue(instance != address(0));
        
        // Verify the deployed EventBus has custom owner
        EventBus eventBus = EventBus(instance);
        assertEq(eventBus.owner(), customOwner);
    }
    
    function test_DeployMultipleInstances() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployEventBus();
        address instance2 = factory.deployEventBus();
        vm.stopPrank();
        
        assertTrue(instance1 != address(0));
        assertTrue(instance2 != address(0));
        assertTrue(instance1 != instance2);
    }
    
    function test_DeployEventBusWithOwner_RevertZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert("Invalid owner");
        factory.deployEventBusWithOwner(address(0));
    }
    
    function test_SetInstanceOwner() public {
        vm.prank(owner);
        factory.setInstanceOwner(customOwner);
        
        assertEq(factory.getInstanceOwner(), customOwner);
        
        // Deploy with new instance owner
        vm.prank(deployer);
        address instance = factory.deployEventBus();
        
        EventBus eventBus = EventBus(instance);
        assertEq(eventBus.owner(), customOwner);
    }
    
    function test_OnlyOwnerCanSetInstanceOwner() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setInstanceOwner(customOwner);
    }
    
    function test_TransferOwnership() public {
        // Step 1: Initiate transfer
        vm.prank(owner);
        factory.transferOwnership(customOwner);
        
        // Owner should still be the original
        assertEq(factory.owner(), owner);
        
        // Step 2: Accept transfer
        vm.prank(customOwner);
        factory.acceptOwnership();
        
        assertEq(factory.owner(), customOwner);
    }
    
    function test_OnlyOwnerCanTransferOwnership() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.transferOwnership(customOwner);
    }
}
