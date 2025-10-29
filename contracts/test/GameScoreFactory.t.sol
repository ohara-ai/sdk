// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {GameScoreFactory} from "../src/factories/GameScoreFactory.sol";
import {GameScore} from "../src/features/scoreboard/GameScore.sol";

contract GameScoreFactoryTest is Test {
    GameScoreFactory public factory;

    address public factoryOwner = address(this);
    address public instanceOwner = address(0x1);

    event GameScoreDeployed(
        address indexed instance,
        address indexed owner
    );

    function setUp() public {
        factory = new GameScoreFactory();
    }

    function test_DeployGameScore() public {
        vm.expectEmit(false, true, false, false);
        emit GameScoreDeployed(address(0), factoryOwner);
        
        address instance = factory.deployGameScore();
        
        assertTrue(instance != address(0));
        
        GameScore gameScore = GameScore(instance);
        assertEq(gameScore.owner(), factoryOwner); // Should use factory owner by default
        assertEq(gameScore.controller(), address(this)); // Caller is the controller
        assertEq(gameScore.getTotalMatches(), 0);
        assertEq(gameScore.getTotalPlayers(), 0);
    }

    function test_DeployMultipleInstances() public {
        address instance1 = factory.deployGameScore();
        address instance2 = factory.deployGameScore();
        
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
        address instance = factory.deployGameScore();
        
        GameScore gameScore = GameScore(instance);
        assertEq(gameScore.owner(), instanceOwner); // Should use custom instance owner
    }

    function test_ResetInstanceOwnerToFactoryOwner() public {
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Reset to factory owner by setting to address(0)
        factory.setInstanceOwner(address(0));
        
        // Deploy instance
        address instance = factory.deployGameScore();
        
        GameScore gameScore = GameScore(instance);
        assertEq(gameScore.owner(), factoryOwner); // Should use factory owner again
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
        
        address instance1 = factory.deployGameScore();
        address instance2 = factory.deployGameScore();
        
        GameScore gameScore1 = GameScore(instance1);
        GameScore gameScore2 = GameScore(instance2);
        
        // Both should have same owner
        assertEq(gameScore1.owner(), instanceOwner);
        assertEq(gameScore2.owner(), instanceOwner);
        
        // Both should have the test contract as controller (since it called deployGameScore)
        assertEq(gameScore1.controller(), address(this));
        assertEq(gameScore2.controller(), address(this));
        
        // Authorize recorder on first instance only (as controller)
        address recorder = address(0x999);
        gameScore1.setRecorderAuthorization(recorder, true);
        
        // First instance should have authorized recorder
        assertTrue(gameScore1.authorizedRecorders(recorder));
        
        // Second instance should NOT have authorized recorder
        assertFalse(gameScore2.authorizedRecorders(recorder));
    }

    function test_FactoryOwnerCanTransferFactoryOwnership() public {
        address newFactoryOwner = address(0x456);
        
        factory.transferOwnership(newFactoryOwner);
        
        assertEq(factory.owner(), newFactoryOwner);
    }

    function test_DeployedInstancesRetainTheirOwner() public {
        // Deploy first instance with factory owner
        address instance1 = factory.deployGameScore();
        GameScore gameScore1 = GameScore(instance1);
        assertEq(gameScore1.owner(), factoryOwner);
        
        // Transfer factory ownership
        address newFactoryOwner = address(0x456);
        factory.transferOwnership(newFactoryOwner);
        
        // First instance should still have original owner
        assertEq(gameScore1.owner(), factoryOwner);
        
        // New deployment should use new factory owner
        vm.prank(newFactoryOwner);
        address instance2 = factory.deployGameScore();
        GameScore gameScore2 = GameScore(instance2);
        assertEq(gameScore2.owner(), newFactoryOwner);
    }

    function test_MultipleDeploymentsDifferentOwners() public {
        address owner1 = address(0x111);
        address owner2 = address(0x222);
        
        // Deploy with owner1
        factory.setInstanceOwner(owner1);
        address instance1 = factory.deployGameScore();
        
        // Change to owner2
        factory.setInstanceOwner(owner2);
        address instance2 = factory.deployGameScore();
        
        GameScore gameScore1 = GameScore(instance1);
        GameScore gameScore2 = GameScore(instance2);
        
        assertEq(gameScore1.owner(), owner1);
        assertEq(gameScore2.owner(), owner2);
    }

    function test_DeployedGameScoreFunctionality() public {
        address instance = factory.deployGameScore();
        GameScore gameScore = GameScore(instance);
        
        // Authorize a recorder (as controller, which is the test contract)
        address recorder = address(0x888);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Record a match result
        address winner = address(0xAAA);
        address[] memory losers = new address[](1);
        losers[0] = address(0xBBB);
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, winner, losers, 100 ether);
        
        // Verify the record
        (uint256 totalWins, uint256 totalPrize, , ) = gameScore.getPlayerScore(winner);
        assertEq(totalWins, 1);
        assertEq(totalPrize, 100 ether);
        
        assertEq(gameScore.getTotalMatches(), 1);
        assertEq(gameScore.getTotalPlayers(), 2);
    }

    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);

    function test_DefaultLimits() public view {
        assertEq(factory.maxLosersPerMatch(), 50);
        assertEq(factory.maxTotalPlayers(), 1000);
        assertEq(factory.maxTotalMatches(), 100);
    }

    function test_DeployedGameScoreUsesFactoryLimits() public {
        address instance = factory.deployGameScore();
        GameScore gameScore = GameScore(instance);
        
        assertEq(gameScore.maxLosersPerMatch(), 50);
        assertEq(gameScore.maxTotalPlayers(), 1000);
        assertEq(gameScore.maxTotalMatches(), 100);
    }

    function test_SetDeploymentLimits() public {
        factory.setDeploymentLimits(100, 20000, 200000);
        
        assertEq(factory.maxLosersPerMatch(), 100);
        assertEq(factory.maxTotalPlayers(), 20000);
        assertEq(factory.maxTotalMatches(), 200000);
    }

    function test_OnlyOwnerCanSetDeploymentLimits() public {
        address nonOwner = address(0x123);
        
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDeploymentLimits(100, 20000, 200000);
    }

    function test_NewDeploymentsUseUpdatedLimits() public {
        // Deploy with default limits
        address instance1 = factory.deployGameScore();
        GameScore gameScore1 = GameScore(instance1);
        
        assertEq(gameScore1.maxLosersPerMatch(), 50);
        
        // Update limits
        factory.setDeploymentLimits(100, 20000, 200000);
        
        // Deploy with new limits
        address instance2 = factory.deployGameScore();
        GameScore gameScore2 = GameScore(instance2);
        
        assertEq(gameScore2.maxLosersPerMatch(), 100);
        assertEq(gameScore2.maxTotalPlayers(), 20000);
        assertEq(gameScore2.maxTotalMatches(), 200000);
        
        // First instance should still have old limits
        assertEq(gameScore1.maxLosersPerMatch(), 50);
    }
}
