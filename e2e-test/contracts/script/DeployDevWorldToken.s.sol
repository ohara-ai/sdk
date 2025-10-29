// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {DevWorldToken} from "../src/tokens/DevWorldToken.sol";

contract DeployDevWorldToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy DEVWORLD token with 1 million initial supply
        // 1,000,000 * 10^18 = 1000000000000000000000000
        uint256 initialSupply = 1_000_000 * 10**18;
        DevWorldToken devWorldToken = new DevWorldToken(initialSupply);
        
        console.log("DEVWORLD token deployed at:", address(devWorldToken));
        console.log("Initial supply:", initialSupply);
        console.log("Token owner:", msg.sender);
        
        vm.stopBroadcast();
    }
}
