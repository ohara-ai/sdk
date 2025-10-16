// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {ScoreBoardFactory} from "../src/factories/ScoreBoardFactory.sol";
import {ScoreBoard} from "../src/features/scoreboard/ScoreBoard.sol";

contract ScoreBoardFactoryTest is Test {
    ScoreBoardFactory public factory;

    address public factoryOwner = address(this);
    address public instanceOwner = address(0x1);

    event ScoreBoardDeployed(
        address indexed instance,
        address indexed owner
    );

    function setUp() public {
        factory = new ScoreBoardFactory();
    }

    function test_DeployScoreBoard() public {
        vm.expectEmit(false, true, false, false);
        emit ScoreBoardDeployed(address(0), factoryOwner);
        
        address instance = factory.deployScoreBoard();
        
        assertTrue(instance != address(0));
        
        ScoreBoard scoreBoard = ScoreBoard(instance);
        assertEq(scoreBoard.owner(), factoryOwner); // Should use factory owner by default
        assertEq(scoreBoard.getTotalMatches(), 0);
        assertEq(scoreBoard.getTotalPlayers(), 0);
    }

    function test_DeployMultipleInstances() public {
        address instance1 = factory.deployScoreBoard();
        address instance2 = factory.deployScoreBoard();
        
        assertTrue(instance1 != instance2);
    }

    function test_SetInstanceOwner() public {
        // Initially instanceOwner should be address(0)
        assertEq(factory.instanceOwner(), address(0));
        assertEq(factory.getInstanceOwner(), factoryOwner);
        
        // Set a custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        assertEq(factory.instanceOwner(), instanceOwner);
        assertEq(factory.getInstanceOwner(), instanceOwner);
    }

    function test_DeployWithCustomInstanceOwner() public {
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Deploy instance
        address instance = factory.deployScoreBoard();
        
        ScoreBoard scoreBoard = ScoreBoard(instance);
        assertEq(scoreBoard.owner(), instanceOwner); // Should use custom instance owner
    }

    function test_ResetInstanceOwnerToFactoryOwner() public {
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Reset to factory owner by setting to address(0)
        factory.setInstanceOwner(address(0));
        
        // Deploy instance
        address instance = factory.deployScoreBoard();
        
        ScoreBoard scoreBoard = ScoreBoard(instance);
        assertEq(scoreBoard.owner(), factoryOwner); // Should use factory owner again
    }

    function test_OnlyOwnerCanSetInstanceOwner() public {
        address nonOwner = address(0x123);
        
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setInstanceOwner(instanceOwner);
    }

    function test_InstanceOwnerUpdatedEvent() public {
        vm.expectEmit(true, true, false, false);
        emit InstanceOwnerUpdated(address(0), instanceOwner);
        
        factory.setInstanceOwner(instanceOwner);
    }

    function test_EachDeployedInstanceIsIndependent() public {
        factory.setInstanceOwner(instanceOwner);
        
        address instance1 = factory.deployScoreBoard();
        address instance2 = factory.deployScoreBoard();
        
        ScoreBoard scoreBoard1 = ScoreBoard(instance1);
        ScoreBoard scoreBoard2 = ScoreBoard(instance2);
        
        // Both should have same owner
        assertEq(scoreBoard1.owner(), instanceOwner);
        assertEq(scoreBoard2.owner(), instanceOwner);
        
        // Authorize recorder on first instance only
        address recorder = address(0x999);
        vm.prank(instanceOwner);
        scoreBoard1.setRecorderAuthorization(recorder, true);
        
        // First instance should have authorized recorder
        assertTrue(scoreBoard1.authorizedRecorders(recorder));
        
        // Second instance should NOT have authorized recorder
        assertFalse(scoreBoard2.authorizedRecorders(recorder));
    }

    function test_FactoryOwnerCanTransferFactoryOwnership() public {
        address newFactoryOwner = address(0x456);
        
        factory.transferOwnership(newFactoryOwner);
        
        assertEq(factory.owner(), newFactoryOwner);
    }

    function test_DeployedInstancesRetainTheirOwner() public {
        // Deploy first instance with factory owner
        address instance1 = factory.deployScoreBoard();
        ScoreBoard scoreBoard1 = ScoreBoard(instance1);
        assertEq(scoreBoard1.owner(), factoryOwner);
        
        // Transfer factory ownership
        address newFactoryOwner = address(0x456);
        factory.transferOwnership(newFactoryOwner);
        
        // First instance should still have original owner
        assertEq(scoreBoard1.owner(), factoryOwner);
        
        // New deployment should use new factory owner
        vm.prank(newFactoryOwner);
        address instance2 = factory.deployScoreBoard();
        ScoreBoard scoreBoard2 = ScoreBoard(instance2);
        assertEq(scoreBoard2.owner(), newFactoryOwner);
    }

    function test_MultipleDeploymentsDifferentOwners() public {
        address owner1 = address(0x111);
        address owner2 = address(0x222);
        
        // Deploy with owner1
        factory.setInstanceOwner(owner1);
        address instance1 = factory.deployScoreBoard();
        
        // Change to owner2
        factory.setInstanceOwner(owner2);
        address instance2 = factory.deployScoreBoard();
        
        ScoreBoard scoreBoard1 = ScoreBoard(instance1);
        ScoreBoard scoreBoard2 = ScoreBoard(instance2);
        
        assertEq(scoreBoard1.owner(), owner1);
        assertEq(scoreBoard2.owner(), owner2);
    }

    function test_DeployedScoreBoardFunctionality() public {
        address instance = factory.deployScoreBoard();
        ScoreBoard scoreBoard = ScoreBoard(instance);
        
        // Authorize a recorder
        address recorder = address(0x888);
        vm.prank(factoryOwner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        // Record a match result
        address winner = address(0xAAA);
        address[] memory losers = new address[](1);
        losers[0] = address(0xBBB);
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, winner, losers, 100 ether);
        
        // Verify the record
        (uint256 totalWins, uint256 totalPrize, , ) = scoreBoard.getPlayerScore(winner);
        assertEq(totalWins, 1);
        assertEq(totalPrize, 100 ether);
        
        assertEq(scoreBoard.getTotalMatches(), 1);
        assertEq(scoreBoard.getTotalPlayers(), 2);
    }

    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);
}
