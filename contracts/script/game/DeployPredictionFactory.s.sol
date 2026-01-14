// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {PredictionFactory} from "../../src/factories/game/PredictionFactory.sol";

/**
 * @title DeployPredictionFactory
 * @notice Deployment script for PredictionFactory contract
 * @dev Run with: forge script script/game/DeployPredictionFactory.s.sol:DeployPredictionFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployPredictionFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        PredictionFactory factory = new PredictionFactory();
        console.log("PredictionFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
