// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {MatchFactory} from "../src/factories/game/MatchFactory.sol";

contract DeployMatchFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
               
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory
        MatchFactory factory = new MatchFactory();
        console.log("MatchFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
    }
}
