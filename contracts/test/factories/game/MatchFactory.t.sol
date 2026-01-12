// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MatchFactory} from "../../../src/factories/game/MatchFactory.sol";
import {Match} from "../../../src/features/game/Match.sol";

contract MatchFactoryTest is Test {
    MatchFactory public factory;

    address public factoryOwner = address(this);
    address public instanceOwner = address(0x1);
    address public controller = address(0x2);

    event MatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address gameScore
    );

    function setUp() public {
        factory = new MatchFactory();
    }

    function test_DeployGameMatch() public {
        vm.expectEmit(false, true, true, true);
        emit MatchDeployed(address(0), factoryOwner, address(this), address(0));
        
        address instance = factory.deployMatch(address(0));
        
        assertTrue(instance != address(0));
        
        Match gameMatch = Match(instance);
        assertEq(gameMatch.owner(), factoryOwner); // Should use factory owner by default
        assertEq(gameMatch.controller(), address(this)); // Caller is the controller
        assertEq(gameMatch.featureName(), "Match - OCI-001");
        assertEq(gameMatch.version(), "1.0.0");
    }

    function test_DeployMultipleInstances() public {
        address instance1 = factory.deployMatch(address(0));
        address instance2 = factory.deployMatch(address(0));
        
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
        address gameScoreAddress = address(0x888);
        
        // Deploy with scoreboard
        address instance = factory.deployMatch(gameScoreAddress);
        
        assertTrue(instance != address(0));
        
        Match gameMatch = Match(instance);
        
        // Verify basic configuration
        assertEq(gameMatch.owner(), factoryOwner); // Should use factory owner
        assertEq(gameMatch.controller(), address(this)); // Caller is the controller
        
        // Verify scoreboard is set
        assertEq(address(gameMatch.score()), gameScoreAddress);
        
        // Configure fees after deployment
        gameMatch.configureFees(feeRecipients, feeShares);
        
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
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Deploy instance
        address instance = factory.deployMatch(address(0));
        
        Match gameMatch = Match(instance);
        assertEq(gameMatch.owner(), instanceOwner); // Should use custom instance owner
    }

    function test_ResetInstanceOwnerToFactoryOwner() public {
        // Set custom instance owner
        factory.setInstanceOwner(instanceOwner);
        
        // Reset to factory owner by setting to address(0)
        factory.setInstanceOwner(address(0));
        
        // Deploy instance
        address instance = factory.deployMatch(address(0));
        
        Match gameMatch = Match(instance);
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
        address instance = factory.deployMatch(address(0));
        Match gameMatch = Match(instance);
        
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
        // Deploy with default (100)
        address instance1 = factory.deployMatch(address(0));
        Match gameMatch1 = Match(instance1);
        
        assertEq(gameMatch1.maxActiveMatches(), 100);
        
        // Update default
        factory.setDefaultMaxActiveMatches(200);
        
        // Deploy with new default (200)
        address instance2 = factory.deployMatch(address(0));
        Match gameMatch2 = Match(instance2);
        
        assertEq(gameMatch2.maxActiveMatches(), 200);
        
        // First instance should still have old limit
        assertEq(gameMatch1.maxActiveMatches(), 100);
    }

    function test_SetDefaultFees() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x100);
        recipients[1] = address(0x200);
        uint256[] memory shares = new uint256[](2);
        shares[0] = 250; // 2.5%
        shares[1] = 250; // 2.5%
        
        vm.expectEmit(false, false, false, true);
        emit DefaultFeesUpdated(recipients, shares);
        factory.setDefaultFees(recipients, shares);
        
        (address[] memory storedRecipients, uint256[] memory storedShares) = factory.getDefaultFees();
        assertEq(storedRecipients.length, 2);
        assertEq(storedRecipients[0], address(0x100));
        assertEq(storedRecipients[1], address(0x200));
        assertEq(storedShares[0], 250);
        assertEq(storedShares[1], 250);
    }
    
    function test_DeployWithDefaultFees() public {
        // Configure default fees in factory
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x999);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%
        
        factory.setDefaultFees(recipients, shares);
        
        // Deploy instance
        address instance = factory.deployMatch(address(0));
        Match gameMatch = Match(instance);
        
        // Verify fees are configured
        (
            address[] memory instanceRecipients,
            uint256[] memory instanceShares,
            uint256 totalShare
        ) = gameMatch.getFeeConfiguration();
        
        assertEq(instanceRecipients.length, 1);
        assertEq(instanceRecipients[0], address(0x999));
        assertEq(instanceShares[0], 1000);
        assertEq(totalShare, 1000);
    }
    
    function test_OnlyOwnerCanSetDefaultFees() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x999);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000;
        
        address nonOwner = address(0x123);
        
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_SetDefaultFees_RevertLengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x100);
        recipients[1] = address(0x200);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 250;
        
        vm.expectRevert(MatchFactory.LengthMismatch.selector);
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_SetDefaultFees_RevertMaxFeeExceeded() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x100);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 5001; // Max is 5000 (50%)
        
        vm.expectRevert(MatchFactory.MaxFeeExceeded.selector);
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_SetDefaultFees_MultipleSumsExceedMax() public {
        address[] memory recipients = new address[](3);
        recipients[0] = address(0x100);
        recipients[1] = address(0x200);
        recipients[2] = address(0x300);
        uint256[] memory shares = new uint256[](3);
        shares[0] = 2000;
        shares[1] = 2000;
        shares[2] = 1001; // Total = 5001, exceeds 5000
        
        vm.expectRevert(MatchFactory.MaxFeeExceeded.selector);
        factory.setDefaultFees(recipients, shares);
    }
    
    function test_SetDefaultFees_AtMaximum() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x100);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 5000; // Exactly at max
        
        factory.setDefaultFees(recipients, shares);
        
        (address[] memory storedRecipients, uint256[] memory storedShares) = factory.getDefaultFees();
        assertEq(storedRecipients.length, 1);
        assertEq(storedShares[0], 5000);
    }
    
    function test_Implementation_IsImmutable() public view {
        assertTrue(factory.IMPLEMENTATION() != address(0));
    }
    
    function test_ClearDefaultFees() public {
        // Set fees first
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x100);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 250;
        factory.setDefaultFees(recipients, shares);
        
        // Clear fees by setting empty arrays
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        factory.setDefaultFees(emptyRecipients, emptyShares);
        
        (address[] memory storedRecipients, uint256[] memory storedShares) = factory.getDefaultFees();
        assertEq(storedRecipients.length, 0);
        assertEq(storedShares.length, 0);
    }

    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event DefaultMaxActiveMatchesUpdated(uint256 newDefault);
    event DefaultFeesUpdated(address[] recipients, uint256[] shares);
}
