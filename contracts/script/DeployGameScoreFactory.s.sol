// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import {GameScoreFactory} from "../src/factories/GameScoreFactory.sol";

/**
 * @title DeployGameScoreFactory
 * @notice Deployment script for GameScoreFactory contract
 * @dev Run with: forge script script/DeployGameScoreFactory.s.sol:DeployGameScoreFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployGameScoreFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        GameScoreFactory factory = new GameScoreFactory();
        console.log("GameScoreFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
