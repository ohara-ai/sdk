// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Match} from "../../src/features/game/Match.sol";
import {MatchFactory} from "../../src/factories/game/MatchFactory.sol";

contract FeatureControllerTest is Test {
    MatchFactory public factory;
    Match public gameMatch;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public newController = address(0x3);
    address public unauthorizedUser = address(0x4);
    address public player1 = address(0x5);

    function setUp() public {
        vm.startPrank(owner);
        factory = new MatchFactory();
        
        vm.startPrank(controller);
        address instance = factory.deployMatch(address(0));
        gameMatch = Match(instance);
        vm.stopPrank();
        
        // Fund players
        vm.deal(controller, 100 ether);
        vm.deal(player1, 100 ether);
    }

    function test_SetController() public {
        vm.startPrank(owner);
        
        // Verify current controller
        assertEq(gameMatch.controller(), controller);
        
        // Set new controller
        vm.expectEmit(true, true, false, true);
        emit ControllerUpdated(controller, newController);
        gameMatch.setController(newController);
        
        // Verify controller was updated
        assertEq(gameMatch.controller(), newController);
        
        vm.stopPrank();
    }

    function test_SetController_RevertZeroAddress() public {
        vm.startPrank(owner);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidController()"));
        gameMatch.setController(address(0));
        
        vm.stopPrank();
    }

    function test_SetController_RevertSameController() public {
        vm.startPrank(owner);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidController()"));
        gameMatch.setController(controller);
        
        vm.stopPrank();
    }

    function test_SetController_OnlyOwner() public {
        vm.startPrank(unauthorizedUser);
        
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setController(newController);
        
        vm.stopPrank();
    }

    function test_OnlyControllerModifier() public {
        // Create a match
        vm.startPrank(controller);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        // Add second player
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(0);
        vm.stopPrank();
        
        // Try to activate as unauthorized user - should revert
        vm.startPrank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.activate(0);
        vm.stopPrank();
        
        // Controller should be able to activate
        vm.startPrank(controller);
        gameMatch.activate(0);
        vm.stopPrank();
    }

    function test_OnlyControllerCanCancel() public {
        // Create and activate a match
        vm.startPrank(controller);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(0);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(0);
        vm.stopPrank();
        
        // Unauthorized user cannot cancel
        vm.startPrank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.cancel(0);
        vm.stopPrank();
        
        // Owner cannot cancel (only controller can)
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.cancel(0);
        vm.stopPrank();
        
        // Controller can cancel
        vm.startPrank(controller);
        gameMatch.cancel(0);
        vm.stopPrank();
    }

    function test_InitializeFeatureController_RevertZeroAddress() public {
        // Deploy a new Match without initialization
        Match uninitializedMatch = new Match();
        
        // Try to initialize with zero controller address
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidController()"));
        uninitializedMatch.initialize(
            owner,
            address(0), // Zero controller should revert
            address(0),
            100,
            feeRecipients,
            feeShares
        );
    }

    function test_ConstructorWithZeroController() public {
        // Deploy implementation contract directly (not through factory)
        // Implementation contracts are deployed with zero addresses
        Match implementation = new Match();
        
        // Controller should be zero
        assertEq(implementation.controller(), address(0));
        assertEq(implementation.owner(), address(0));
    }

    function test_ConstructorWithNonZeroController() public view {
        // This is tested implicitly through the factory deployment
        // But let's verify the controller was set correctly
        assertEq(gameMatch.controller(), controller);
        assertEq(gameMatch.owner(), owner);
    }

    function test_OnlyControllerModifier_OwnerCannotAccess() public {
        // Create a match
        vm.startPrank(controller);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(0);
        vm.stopPrank();
        
        // Owner cannot activate (only controller can)
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.activate(0);
        vm.stopPrank();
    }

    function test_ControllerCanChangeAfterUpdate() public {
        // Update controller
        vm.startPrank(owner);
        gameMatch.setController(newController);
        vm.stopPrank();
        
        // Fund new controller
        vm.deal(newController, 100 ether);
        
        // Create a match with new controller
        vm.startPrank(newController);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(0);
        vm.stopPrank();
        
        // Old controller cannot activate
        vm.startPrank(controller);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.activate(0);
        vm.stopPrank();
        
        // New controller can activate
        vm.startPrank(newController);
        gameMatch.activate(0);
        vm.stopPrank();
    }

    function test_SetController_ControllerCannotSetController() public {
        // Controller trying to change controller should fail (only owner can)
        vm.startPrank(controller);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setController(newController);
        vm.stopPrank();
    }

    event ControllerUpdated(address indexed previousController, address indexed newController);
}
