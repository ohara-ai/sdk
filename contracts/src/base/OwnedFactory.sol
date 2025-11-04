// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Owned} from "./Owned.sol";

/**
 * @title OwnedFactory
 * @notice Base factory contract that provides owner address for produced instances
 * @dev Inherits from Owned and allows setting a separate owner for instances
 */
abstract contract OwnedFactory is Owned {
    /// @notice Owner address to use for produced contract instances
    /// @dev If set to address(0), the factory owner will be used
    address public instanceOwner;

    event InstanceOwnerUpdated(address indexed previousOwner, address indexed newOwner);

    constructor(address _factoryOwner) Owned(_factoryOwner) {}

    /**
     * @notice Update the owner address used for new instances
     * @param _newInstanceOwner New owner address (address(0) to use factory owner)
     */
    function setInstanceOwner(address _newInstanceOwner) external onlyOwner {
        address previousOwner = instanceOwner;
        instanceOwner = _newInstanceOwner;
        emit InstanceOwnerUpdated(previousOwner, _newInstanceOwner);
    }

    /**
     * @notice Get the owner address to use for new instances
     * @return Owner address (instanceOwner if set, otherwise factory owner)
     */
    function getInstanceOwner() public view returns (address) {
        return instanceOwner == address(0) ? owner : instanceOwner;
    }
}
