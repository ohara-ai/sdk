// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import {GameMatchFactory} from "../src/factories/GameMatchFactory.sol";

contract DeployGameMatchFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        GameMatchFactory factory = new GameMatchFactory();
        console.log("GameMatchFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
