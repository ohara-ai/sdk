// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {TournamentFactory} from "../../../src/factories/game/TournamentFactory.sol";
import {Tournament} from "../../../src/features/game/Tournament.sol";

contract TournamentFactoryTest is Test {
    TournamentFactory public factory;
    
    address public owner = address(0x1);
    address public deployer = address(0x2);
    address public scoreContract = address(0x3);
    
    event TournamentDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address scoreContract,
        uint256 maxActiveTournaments
    );
    
    function setUp() public {
        vm.prank(owner);
        factory = new TournamentFactory();
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), owner);
        assertTrue(factory.IMPLEMENTATION() != address(0));
        assertEq(factory.defaultMaxActiveTournaments(), 100);
    }
    
    function test_DeployTournament() public {
        vm.prank(deployer);
        address instance = factory.deployTournament(scoreContract);
        
        assertTrue(instance != address(0));
        
        Tournament tournament = Tournament(instance);
        assertEq(tournament.owner(), owner);
        assertEq(tournament.controller(), deployer);
        assertEq(tournament.scoreContract(), scoreContract);
    }
    
    function test_DeployTournamentWithMaxActive() public {
        uint256 maxActive = 50;
        
        vm.prank(deployer);
        address instance = factory.deployTournamentWithMaxActive(scoreContract, maxActive);
        
        assertTrue(instance != address(0));
        
        Tournament tournament = Tournament(instance);
        assertEq(tournament.maxActiveTournaments(), maxActive);
    }
    
    function test_DeployMultipleInstances() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployTournament(scoreContract);
        address instance2 = factory.deployTournament(scoreContract);
        vm.stopPrank();
        
        assertTrue(instance1 != address(0));
        assertTrue(instance2 != address(0));
        assertTrue(instance1 != instance2);
    }
    
    function test_SetDefaultMaxActiveTournaments() public {
        uint256 newMax = 200;
        
        vm.prank(owner);
        factory.setDefaultMaxActiveTournaments(newMax);
        
        assertEq(factory.defaultMaxActiveTournaments(), newMax);
    }
    
    function test_OnlyOwnerCanSetDefaultMaxActiveTournaments() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultMaxActiveTournaments(200);
    }
    
    function test_DeployWithZeroScoreContract() public {
        vm.prank(deployer);
        address instance = factory.deployTournament(address(0));
        
        assertTrue(instance != address(0));
        
        Tournament tournament = Tournament(instance);
        assertEq(tournament.scoreContract(), address(0));
    }
}
