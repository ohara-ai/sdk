// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {PredictionFactory} from "../../../src/factories/game/PredictionFactory.sol";
import {Prediction} from "../../../src/features/game/Prediction.sol";

contract PredictionFactoryTest is Test {
    PredictionFactory public factory;
    
    address public owner = address(0x1);
    address public deployer = address(0x2);
    address public matchContract = address(0x3);
    address public tournamentContract = address(0x4);
    address public leagueContract = address(0x5);
    address public feeRecipient = address(0x6);
    
    event PredictionDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address matchContract,
        address tournamentContract,
        address leagueContract
    );
    
    function setUp() public {
        vm.prank(owner);
        factory = new PredictionFactory();
    }
    
    function test_InitialState() public view {
        assertEq(factory.owner(), owner);
        assertTrue(factory.IMPLEMENTATION() != address(0));
    }
    
    function test_DeployPrediction() public {
        vm.prank(deployer);
        address instance = factory.deployPrediction(
            matchContract,
            tournamentContract,
            leagueContract
        );
        
        assertTrue(instance != address(0));
        
        Prediction prediction = Prediction(payable(instance));
        assertEq(prediction.owner(), owner);
        assertEq(prediction.controller(), deployer);
    }
    
    function test_DeployPredictionWithFees() public {
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = feeRecipient;
        
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 500; // 5%
        
        vm.prank(deployer);
        address instance = factory.deployPredictionWithFees(
            matchContract,
            tournamentContract,
            leagueContract,
            feeRecipients,
            feeShares
        );
        
        assertTrue(instance != address(0));
        
        Prediction prediction = Prediction(payable(instance));
        (address[] memory recipients, uint256[] memory shares, uint256 totalShare) = prediction.getFeeConfiguration();
        assertEq(recipients.length, 1);
        assertEq(recipients[0], feeRecipient);
        assertEq(shares[0], 500);
        assertEq(totalShare, 500);
    }
    
    function test_DeployMultipleInstances() public {
        vm.startPrank(deployer);
        address instance1 = factory.deployPrediction(matchContract, tournamentContract, leagueContract);
        address instance2 = factory.deployPrediction(matchContract, tournamentContract, leagueContract);
        vm.stopPrank();
        
        assertTrue(instance1 != address(0));
        assertTrue(instance2 != address(0));
        assertTrue(instance1 != instance2);
    }
    
    function test_DeployWithZeroContracts() public {
        vm.prank(deployer);
        address instance = factory.deployPrediction(
            address(0),
            address(0),
            address(0)
        );
        
        assertTrue(instance != address(0));
    }
    
    function test_SetInstanceOwner() public {
        address newInstanceOwner = address(0x999);
        
        vm.prank(owner);
        factory.setInstanceOwner(newInstanceOwner);
        
        assertEq(factory.getInstanceOwner(), newInstanceOwner);
        
        vm.prank(deployer);
        address instance = factory.deployPrediction(matchContract, tournamentContract, leagueContract);
        
        Prediction prediction = Prediction(payable(instance));
        assertEq(prediction.owner(), newInstanceOwner);
    }
}
