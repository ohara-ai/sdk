// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ScoreBoard} from "../src/features/scoreboard/ScoreBoard.sol";

/**
 * @title DeployScoreBoard
 * @notice Deployment script for ScoreBoard contract
 * @dev Run with: forge script script/DeployScoreBoard.s.sol:DeployScoreBoard --rpc-url <RPC_URL> --broadcast
 */
contract DeployScoreBoard is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");

        console.log("Deploying ScoreBoard...");
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        ScoreBoard scoreBoard = new ScoreBoard(owner);

        vm.stopBroadcast();

        console.log("ScoreBoard deployed at:", address(scoreBoard));
        console.log("Owner:", owner);
        console.log("");
        console.log("Next steps:");
        console.log("1. Authorize GameMatch contracts to record scores:");
        console.log("   scoreBoard.setRecorderAuthorization(<gamematch_address>, true)");
        console.log("2. Update your .env file with:");
        console.log("   NEXT_PUBLIC_SCOREBOARD_ADDRESS=", address(scoreBoard));
    }
}
