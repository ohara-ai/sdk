// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";
import {GameMatchFactory} from "../src/factories/GameMatchFactory.sol";

contract DeployGameMatch is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address controller = vm.envAddress("CONTROLLER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        GameMatchFactory factory = new GameMatchFactory();
        console.log("GameMatchFactory deployed at:", address(factory));
        
        // Deploy an instance via factory
        address gameMatchInstance = factory.deployGameMatch(msg.sender, controller);
        console.log("GameMatch instance deployed at:", gameMatchInstance);
        
        vm.stopBroadcast();
    }
}
