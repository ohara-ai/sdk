// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameMatchFactory} from "../src/factories/GameMatchFactory.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";

contract GameMatchFactoryTest is Test {
    GameMatchFactory public factory;

    address public factoryOwner = address(this);
    address public instanceOwner = address(0x1);
    address public controller = address(0x2);

    event GameMatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address scoreBoard
    );

    function setUp() public {
        factory = new GameMatchFactory();
    }

    function test_DeployGameMatch() public {
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        vm.expectEmit(false, true, true, true);
        emit GameMatchDeployed(address(0), factoryOwner, controller, address(0));
        
        address instance = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        
        assertTrue(instance != address(0));
        
        GameMatch gameMatch = GameMatch(instance);
        assertEq(gameMatch.owner(), factoryOwner); // Should use factory owner by default
        assertEq(gameMatch.controller(), controller);
        assertEq(gameMatch.featureName(), "GameMatch - OCI-001");
        assertEq(gameMatch.version(), "1.0.0");
    }

    function test_DeployMultipleInstances() public {
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        address instance1 = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        address instance2 = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        
        assertTrue(instance1 != instance2);
    }

    function test_DeployWithFullConfiguration() public {
        // Setup fee configuration
        address feeRecipient = address(0x999);
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = feeRecipient;
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 1000; // 10%
        
        // Setup scoreboard
        address scoreBoardAddress = address(0x888);
        
        // Deploy with full configuration
        address instance = factory.deployGameMatch(
            controller, 
            scoreBoardAddress, 
            feeRecipients, 
            feeShares
        );
        
        assertTrue(instance != address(0));
        
        GameMatch gameMatch = GameMatch(instance);
        
        // Verify basic configuration
        assertEq(gameMatch.owner(), factoryOwner); // Should use factory owner
        assertEq(gameMatch.controller(), controller);
        
        // Verify scoreboard is set
        assertEq(address(gameMatch.scoreBoard()), scoreBoardAddress);
        
        // Verify fee configuration
        (
            address[] memory recipients,
            uint256[] memory shares,
            uint256 totalShare
        ) = gameMatch.getFeeConfiguration();
        
        assertEq(recipients.length, 1);
        assertEq(recipients[0], feeRecipient);
        assertEq(shares.length, 1);
        assertEq(shares[0], 1000);
        assertEq(totalShare, 1000);
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
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Deploy instance
        address instance = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        
        GameMatch gameMatch = GameMatch(instance);
        assertEq(gameMatch.owner(), instanceOwner); // Should use custom instance owner
    }

    function test_ResetInstanceOwnerToFactoryOwner() public {
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Reset to factory owner by setting to address(0)
        factory.setInstanceOwner(address(0));
        
        // Deploy instance
        address instance = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        
        GameMatch gameMatch = GameMatch(instance);
        assertEq(gameMatch.owner(), factoryOwner); // Should use factory owner again
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

    function test_DefaultMaxActiveMatches() public view {
        assertEq(factory.defaultMaxActiveMatches(), 100);
    }

    function test_DeployedGameMatchUsesFactoryDefault() public {
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        address instance = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        GameMatch gameMatch = GameMatch(instance);
        
        assertEq(gameMatch.maxActiveMatches(), 100);
    }

    function test_SetDefaultMaxActiveMatches() public {
        vm.expectEmit(false, false, false, true);
        emit DefaultMaxActiveMatchesUpdated(200);
        factory.setDefaultMaxActiveMatches(200);
        
        assertEq(factory.defaultMaxActiveMatches(), 200);
    }

    function test_OnlyOwnerCanSetDefaultMaxActiveMatches() public {
        address nonOwner = address(0x123);
        
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultMaxActiveMatches(200);
    }

    function test_NewDeploymentsUseUpdatedDefault() public {
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        
        // Deploy with default (100)
        address instance1 = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        GameMatch gameMatch1 = GameMatch(instance1);
        
        assertEq(gameMatch1.maxActiveMatches(), 100);
        
        // Update default
        factory.setDefaultMaxActiveMatches(200);
        
        // Deploy with new default (200)
        address instance2 = factory.deployGameMatch(controller, address(0), emptyRecipients, emptyShares);
        GameMatch gameMatch2 = GameMatch(instance2);
        
        assertEq(gameMatch2.maxActiveMatches(), 200);
        
        // First instance should still have old limit
        assertEq(gameMatch1.maxActiveMatches(), 100);
    }

    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event DefaultMaxActiveMatchesUpdated(uint256 newDefault);
}
