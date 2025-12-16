// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {PrizeFactory} from "../../../src/factories/game/PrizeFactory.sol";
import {Prize} from "../../../src/features/game/Prize.sol";
import {Match} from "../../../src/features/game/Match.sol";

contract PrizeFactoryTest is Test {
    PrizeFactory public factory;
    Match public gameMatch;
    
    address public factoryOwner = address(0x1);
    address public deployer = address(0x2);
    address public instanceOwner = address(0x3);
    
    event PrizeDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        uint256 matchesPerPool
    );
    event DefaultMatchesPerPoolUpdated(uint256 newDefault);
    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);
    
    function setUp() public {
        vm.prank(factoryOwner);
        factory = new PrizeFactory();
        
        // Deploy a Match contract for testing
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        gameMatch = new Match();
        gameMatch.initialize(factoryOwner, deployer, address(0), 100, feeRecipients, feeShares);
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), factoryOwner);
        assertEq(factory.defaultMatchesPerPool(), 42);
        assertTrue(factory.IMPLEMENTATION() != address(0));
    }
    
    function test_DeployPrize() public {
        vm.prank(deployer);
        address instance = factory.deployPrize(address(gameMatch));
        
        assertTrue(instance != address(0));
        
        Prize prize = Prize(payable(instance));
        assertEq(prize.owner(), factoryOwner);
        assertEq(prize.controller(), deployer);
        assertEq(address(prize.matchContract()), address(gameMatch));
        assertEq(prize.getMatchesPerPool(), 42);
    }
    
    function test_DeployPrizeWithCustomConfig() public {
        vm.prank(deployer);
        address instance = factory.deployPrizeWithConfig(address(gameMatch), 100);
        
        Prize prize = Prize(payable(instance));
        assertEq(prize.getMatchesPerPool(), 100);
    }
    
    function test_CannotDeployWithZeroMatchesPerPool() public {
        vm.prank(deployer);
        vm.expectRevert(PrizeFactory.InvalidMatchesPerPool.selector);
        factory.deployPrizeWithConfig(address(gameMatch), 0);
    }
    
    function test_SetDefaultMatchesPerPool() public {
        vm.prank(factoryOwner);
        vm.expectEmit(false, false, false, true);
        emit DefaultMatchesPerPoolUpdated(100);
        factory.setDefaultMatchesPerPool(100);
        
        assertEq(factory.defaultMatchesPerPool(), 100);
    }
    
    function test_OnlyOwnerCanSetDefaultMatchesPerPool() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultMatchesPerPool(100);
    }
    
    function test_CannotSetDefaultMatchesPerPoolToZero() public {
        vm.prank(factoryOwner);
        vm.expectRevert(PrizeFactory.InvalidMatchesPerPool.selector);
        factory.setDefaultMatchesPerPool(0);
    }
    
    function test_SetInstanceOwner() public {
        vm.prank(factoryOwner);
        vm.expectEmit(true, true, false, true);
        emit InstanceOwnerUpdated(address(0), instanceOwner);
        factory.setInstanceOwner(instanceOwner);
        
        vm.prank(deployer);
        address instance = factory.deployPrize(address(gameMatch));
        
        Prize prize = Prize(payable(instance));
        assertEq(prize.owner(), instanceOwner);
    }
    
    function test_DeployPrizeWithNoMatchContract() public {
        vm.prank(deployer);
        address instance = factory.deployPrize(address(0));
        
        Prize prize = Prize(payable(instance));
        assertEq(address(prize.matchContract()), address(0));
    }
    
    function test_MultipleDeploys() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployPrize(address(gameMatch));
        address instance2 = factory.deployPrize(address(gameMatch));
        vm.stopPrank();
        
        assertTrue(instance1 != instance2);
        
        Prize prize1 = Prize(payable(instance1));
        Prize prize2 = Prize(payable(instance2));
        
        assertEq(prize1.controller(), deployer);
        assertEq(prize2.controller(), deployer);
    }
}
