// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {EventBus} from "../../base/EventBus.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";

/**
 * @title EventBusFactory
 * @notice Factory for deploying EventBus contracts
 * @dev EventBus is not a clone-based contract since it doesn't use Initializable pattern
 */
contract EventBusFactory is OwnedFactory {
    event EventBusDeployed(
        address indexed instance,
        address indexed owner
    );

    constructor() OwnedFactory(msg.sender) {}

    /**
     * @notice Deploy a new EventBus contract
     * @return instance Address of the deployed contract
     * @dev The instance owner will be set to the configured instance owner
     */
    function deployEventBus() external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        // Deploy new EventBus contract
        instance = address(new EventBus(instanceOwnerAddress));
        
        emit EventBusDeployed(instance, instanceOwnerAddress);
    }

    /**
     * @notice Deploy a new EventBus contract with custom owner
     * @param _owner Owner address for the deployed EventBus
     * @return instance Address of the deployed contract
     */
    function deployEventBusWithOwner(address _owner) external returns (address instance) {
        require(_owner != address(0), "Invalid owner");
        
        instance = address(new EventBus(_owner));
        
        emit EventBusDeployed(instance, _owner);
    }
}
