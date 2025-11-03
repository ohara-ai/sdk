// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {MatchFactory} from "../../src/factories/game/MatchFactory.sol";
import {Match} from "../../src/features/game/Match.sol";

contract FeeCollectorValidationTest is Test {
    MatchFactory public factory;
    
    address public owner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address public controller = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function setUp() public {
        factory = new MatchFactory();
    }

    function test_DeployWithExactAPIParams() public {
        // Deploy first
        address instance = factory.deployMatch(address(0));
        
        assertTrue(instance != address(0));
        console.log("Deployed successfully at:", instance);
        
        // Configure fees after deployment
        Match gameMatch = Match(instance);
        
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 1000;
        
        gameMatch.configureFees(feeRecipients, feeShares);
        
        // Verify fee configuration
        (
            address[] memory recipients,
            uint256[] memory shares,
            uint256 totalShare
        ) = gameMatch.getFeeConfiguration();
        
        assertEq(recipients.length, 1);
        assertEq(recipients[0], 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        assertEq(shares[0], 1000);
        assertEq(totalShare, 1000);
    }
    
    function test_DeployWithZeroAddressRecipient_Reverts() public {
        // Deploy first
        address instance = factory.deployMatch(address(0));
        
        assertTrue(instance != address(0));
        console.log("Deployed with zero recipient at:", instance);
        
        // Configure fees with zero address recipient should revert
        Match gameMatch = Match(instance);
        
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = address(0);
        
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 1000;
        
        // Should revert with InvalidFeeRecipient error
        vm.expectRevert(abi.encodeWithSignature("InvalidFeeRecipient()"));
        gameMatch.configureFees(feeRecipients, feeShares);
    }
}
