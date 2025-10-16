// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import {ScoreBoardFactory} from "../src/factories/ScoreBoardFactory.sol";

/**
 * @title DeployScoreBoardFactory
 * @notice Deployment script for ScoreBoardFactory contract
 * @dev Run with: forge script script/DeployScoreBoardFactory.s.sol:DeployScoreBoardFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployScoreBoardFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        ScoreBoardFactory factory = new ScoreBoardFactory();
        console.log("ScoreBoardFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
