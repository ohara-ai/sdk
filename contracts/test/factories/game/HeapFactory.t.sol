// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {HeapFactory} from "../../../src/factories/game/HeapFactory.sol";
import {Heap} from "../../../src/features/game/Heap.sol";
import {Score} from "../../../src/features/game/Score.sol";

contract HeapFactoryTest is Test {
    HeapFactory public factory;
    Score public gameScore;
    
    address public factoryOwner = address(0x1);
    address public deployer = address(0x2);
    address public instanceOwner = address(0x3);
    address public feeRecipient1 = address(0x4);
    address public feeRecipient2 = address(0x5);
    
    event HeapDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address score
    );
    event DefaultMaxActiveHeapsUpdated(uint256 newDefault);
    event DefaultFeesUpdated(address[] recipients, uint256[] shares);
    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);
    
    function setUp() public {
        vm.prank(factoryOwner);
        factory = new HeapFactory();
        
        // Deploy a Score contract for testing
        gameScore = new Score();
        gameScore.initialize(factoryOwner, deployer, 50, 1000, 100);
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), factoryOwner);
        assertEq(factory.defaultMaxActiveHeaps(), 100);
        assertTrue(factory.IMPLEMENTATION() != address(0));
        
        // Default fees should be empty
        (address[] memory recipients, uint256[] memory shares) = factory.getDefaultFees();
        assertEq(recipients.length, 0);
        assertEq(shares.length, 0);
    }
    
    function test_DeployHeap() public {
        vm.prank(deployer);
        vm.expectEmit(false, true, true, true);
        emit HeapDeployed(address(0), factoryOwner, deployer, address(gameScore));
        address instance = factory.deployHeap(address(gameScore));
        
        assertTrue(instance != address(0));
        
        Heap heap = Heap(instance);
        assertEq(heap.owner(), factoryOwner);
        assertEq(heap.controller(), deployer);
        assertEq(address(heap.score()), address(gameScore));
        assertEq(heap.maxActiveHeaps(), 100);
    }
    
    function test_DeployHeapWithoutScore() public {
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        
        Heap heap = Heap(instance);
        assertEq(address(heap.score()), address(0));
    }
    
    function test_SetDefaultMaxActiveHeaps() public {
        vm.prank(factoryOwner);
        vm.expectEmit(false, false, false, true);
        emit DefaultMaxActiveHeapsUpdated(200);
        factory.setDefaultMaxActiveHeaps(200);
        
        assertEq(factory.defaultMaxActiveHeaps(), 200);
        
        // Deploy and verify new default is used
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        Heap heap = Heap(instance);
        assertEq(heap.maxActiveHeaps(), 200);
    }
    
    function test_OnlyOwnerCanSetDefaultMaxActiveHeaps() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultMaxActiveHeaps(200);
    }
    
    function test_SetDefaultFees() public {
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        
        uint256[] memory shares = new uint256[](2);
        shares[0] = 200; // 2%
        shares[1] = 300; // 3%
        
        vm.prank(factoryOwner);
        vm.expectEmit(false, false, false, true);
        emit DefaultFeesUpdated(recipients, shares);
        factory.setDefaultFees(recipients, shares);
        
        (address[] memory storedRecipients, uint256[] memory storedShares) = factory.getDefaultFees();
        assertEq(storedRecipients.length, 2);
        assertEq(storedRecipients[0], feeRecipient1);
        assertEq(storedRecipients[1], feeRecipient2);
        assertEq(storedShares[0], 200);
        assertEq(storedShares[1], 300);
    }
    
    function test_OnlyOwnerCanSetDefaultFees() public {
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100;
        
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_CannotSetFeesWithLengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100;
        
        vm.prank(factoryOwner);
        vm.expectRevert(HeapFactory.LengthMismatch.selector);
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_CannotSetFeesExceedingMax() public {
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        
        uint256[] memory shares = new uint256[](2);
        shares[0] = 3000; // 30%
        shares[1] = 2500; // 25% - total 55% exceeds 50% max
        
        vm.prank(factoryOwner);
        vm.expectRevert(HeapFactory.MaxFeeExceeded.selector);
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_DeployWithDefaultFees() public {
        // Set default fees
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 500; // 5%
        
        vm.prank(factoryOwner);
        factory.setDefaultFees(recipients, shares);
        
        // Deploy heap
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        
        Heap heap = Heap(instance);
        
        // Verify fees are configured (by checking total fee)
        assertEq(heap.totalFeeShare(), 500);
    }
    
    function test_SetInstanceOwner() public {
        vm.prank(factoryOwner);
        vm.expectEmit(true, true, false, true);
        emit InstanceOwnerUpdated(address(0), instanceOwner);
        factory.setInstanceOwner(instanceOwner);
        
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        
        Heap heap = Heap(instance);
        assertEq(heap.owner(), instanceOwner);
    }
    
    function test_MultipleDeploys() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployHeap(address(0));
        address instance2 = factory.deployHeap(address(0));
        address instance3 = factory.deployHeap(address(gameScore));
        vm.stopPrank();
        
        assertTrue(instance1 != instance2);
        assertTrue(instance2 != instance3);
        assertTrue(instance1 != instance3);
        
        Heap heap1 = Heap(instance1);
        Heap heap2 = Heap(instance2);
        Heap heap3 = Heap(instance3);
        
        assertEq(heap1.controller(), deployer);
        assertEq(heap2.controller(), deployer);
        assertEq(heap3.controller(), deployer);
        
        assertEq(address(heap3.score()), address(gameScore));
    }
    
    function test_FeatureMetadata() public {
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        
        Heap heap = Heap(instance);
        assertEq(heap.version(), "1.0.0");
        assertEq(heap.featureName(), "Heap - OCI-002");
    }
    
    function test_DeployedHeapCanCreateHeaps() public {
        vm.prank(deployer);
        address instance = factory.deployHeap(address(0));
        
        Heap heap = Heap(instance);
        
        // Fund player
        address player = address(0x123);
        vm.deal(player, 10 ether);
        
        // Create a heap
        vm.prank(player);
        uint256 heapId = heap.create{value: 1 ether}(address(0), 1 ether, 2);
        
        assertEq(heapId, 0);
        
        (
            address token,
            uint256 contributionAmount,
            uint256 maxContributions,
            address[] memory contributors,
            ,
            ,
        ) = heap.getHeap(heapId);
        
        assertEq(token, address(0));
        assertEq(contributionAmount, 1 ether);
        assertEq(maxContributions, 2);
        assertEq(contributors.length, 1);
        assertEq(contributors[0], player);
    }
}
