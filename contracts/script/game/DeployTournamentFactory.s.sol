// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {TournamentFactory} from "../../src/factories/game/TournamentFactory.sol";

/**
 * @title DeployTournamentFactory
 * @notice Deployment script for TournamentFactory contract
 * @dev Run with: forge script script/game/DeployTournamentFactory.s.sol:DeployTournamentFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployTournamentFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        TournamentFactory factory = new TournamentFactory();
        console.log("TournamentFactory deployed at:", address(factory));
        console.log("Tournament implementation at:", factory.IMPLEMENTATION());
        
        vm.stopBroadcast();
    }
}
