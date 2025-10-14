// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameMatchFactory} from "../src/factories/GameMatchFactory.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";

contract FeeCollectorValidationTest is Test {
    GameMatchFactory public factory;
    
    address public owner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address public controller = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function setUp() public {
        factory = new GameMatchFactory();
    }

    function test_DeployWithExactAPIParams() public {
        // Use exact parameters from the API call
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 1000;
        
        address instance = factory.deployGameMatch(
            owner,
            controller, 
            address(0),
            feeRecipients,
            feeShares
        );
        
        assertTrue(instance != address(0));
        console.log("Deployed successfully at:", instance);
    }
    
    function test_DeployWithZeroAddressRecipient() public {
        // Test with zero address recipient
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = address(0);
        
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 1000;
        
        address instance = factory.deployGameMatch(
            owner,
            controller, 
            address(0),
            feeRecipients,
            feeShares
        );
        
        assertTrue(instance != address(0));
        console.log("Deployed with zero recipient at:", instance);
    }
}
