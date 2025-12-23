// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {LeagueFactory} from "../../../src/factories/game/LeagueFactory.sol";
import {League} from "../../../src/features/game/League.sol";

contract LeagueFactoryTest is Test {
    LeagueFactory public factory;
    
    address public owner = address(0x1);
    address public deployer = address(0x2);
    address public matchContract = address(0x3);
    
    event LeagueDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        uint256 cycleDuration
    );
    
    function setUp() public {
        vm.prank(owner);
        factory = new LeagueFactory();
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), owner);
        assertTrue(factory.IMPLEMENTATION() != address(0));
        assertEq(factory.defaultCycleDuration(), 0);
    }
    
    function test_DeployLeague() public {
        vm.prank(deployer);
        address instance = factory.deployLeague(matchContract);
        
        assertTrue(instance != address(0));
        
        League league = League(instance);
        assertEq(league.owner(), owner);
        assertEq(league.controller(), deployer);
        assertEq(league.matchContract(), matchContract);
    }
    
    function test_DeployLeagueWithDuration() public {
        uint256 cycleDuration = 86400; // 1 day
        
        vm.prank(deployer);
        address instance = factory.deployLeagueWithDuration(matchContract, cycleDuration);
        
        assertTrue(instance != address(0));
        
        League league = League(instance);
        assertEq(league.cycleDuration(), cycleDuration);
    }
    
    function test_DeployMultipleInstances() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployLeague(matchContract);
        address instance2 = factory.deployLeague(matchContract);
        vm.stopPrank();
        
        assertTrue(instance1 != address(0));
        assertTrue(instance2 != address(0));
        assertTrue(instance1 != instance2);
    }
    
    function test_SetDefaultCycleDuration() public {
        uint256 newDuration = 172800; // 2 days
        
        vm.prank(owner);
        factory.setDefaultCycleDuration(newDuration);
        
        assertEq(factory.defaultCycleDuration(), newDuration);
    }
    
    function test_OnlyOwnerCanSetDefaultCycleDuration() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultCycleDuration(86400);
    }
    
    function test_DeployWithZeroMatchContract() public {
        vm.prank(deployer);
        address instance = factory.deployLeague(address(0));
        
        assertTrue(instance != address(0));
        
        League league = League(instance);
        assertEq(league.matchContract(), address(0));
    }
}
