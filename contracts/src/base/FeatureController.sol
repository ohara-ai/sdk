// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {FeeCollector} from "./FeeCollector.sol";

/**
 * @title FeatureController
 * @notice Base contract for features with controller role
 */
abstract contract FeatureController is FeeCollector {
    address public controller;

    event ControllerUpdated(address indexed previousController, address indexed newController);

    error InvalidController();

    modifier onlyController() {
        if (msg.sender != controller) revert Unauthorized();
        _;
    }

    modifier onlyControllerOrOwner() {
        if (msg.sender != controller && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _owner, address _controller) FeeCollector(_owner) {
        // Allow address(0) for cloneable implementation contracts
        // The controller will be set via initialization for clones
        if (_controller != address(0)) {
            controller = _controller;
            emit ControllerUpdated(address(0), _controller);
        }
    }

    /**
     * @notice Initialize owner and controller for clones
     * @param _owner Owner address
     * @param _controller Controller address
     * @dev Internal function to be called by inheriting contracts during initialization
     */
    function _initializeFeatureController(address _owner, address _controller) internal {
        _initializeFeeCollector(_owner);
        if (_controller == address(0)) revert InvalidController();
        controller = _controller;
        emit ControllerUpdated(address(0), _controller);
    }

    function setController(address newController) external onlyOwner {
        if (newController == address(0)) revert InvalidController();
        if (newController == controller) revert InvalidController();
        emit ControllerUpdated(controller, newController);
        controller = newController;
    }
}
