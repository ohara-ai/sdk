// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameMatchFactory} from "../src/factories/GameMatchFactory.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";

contract GameMatchFactoryTest is Test {
    GameMatchFactory public factory;

    address public owner = address(0x1);
    address public controller = address(0x2);

    event GameMatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller
    );

    function setUp() public {
        factory = new GameMatchFactory();
    }

    function test_DeployGameMatch() public {
        vm.expectEmit(false, true, true, false);
        emit GameMatchDeployed(address(0), owner, controller);
        
        address instance = factory.deployGameMatch(owner, controller);
        
        assertTrue(instance != address(0));
        
        GameMatch gameMatch = GameMatch(instance);
        assertEq(gameMatch.owner(), owner);
        assertEq(gameMatch.controller(), controller);
        assertEq(gameMatch.featureName(), "GameMatch - OCI-001");
        assertEq(gameMatch.version(), "1.0.0");
    }

    function test_DeployMultipleInstances() public {
        address instance1 = factory.deployGameMatch(owner, controller);
        address instance2 = factory.deployGameMatch(owner, controller);
        
        assertTrue(instance1 != instance2);
    }
}
