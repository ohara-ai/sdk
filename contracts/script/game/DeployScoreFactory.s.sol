// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {ScoreFactory} from "../../src/factories/game/ScoreFactory.sol";

/**
 * @title DeployScoreFactory
 * @notice Deployment script for ScoreFactory contract
 * @dev Run with: forge script script/factories/game/DeployScoreFactory.s.sol:DeployScoreFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployScoreFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        ScoreFactory factory = new ScoreFactory();
        console.log("ScoreFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
