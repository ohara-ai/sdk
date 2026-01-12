// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {LeagueFactory} from "../../src/factories/game/LeagueFactory.sol";

/**
 * @title DeployLeagueFactory
 * @notice Deployment script for LeagueFactory contract
 * @dev Run with: forge script script/game/DeployLeagueFactory.s.sol:DeployLeagueFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployLeagueFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        LeagueFactory factory = new LeagueFactory();
        console.log("LeagueFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
