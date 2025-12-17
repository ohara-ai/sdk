// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {PrizeFactory} from "../../src/factories/game/PrizeFactory.sol";

/**
 * @title DeployPrizeFactory
 * @notice Deployment script for PrizeFactory contract
 * @dev Run with: forge script script/game/DeployPrizeFactory.s.sol:DeployPrizeFactory --rpc-url <RPC_URL> --broadcast
 */
contract DeployPrizeFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy factory
        PrizeFactory factory = new PrizeFactory();
        console.log("PrizeFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
