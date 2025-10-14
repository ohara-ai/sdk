// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

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
        if (_controller == address(0)) revert InvalidController();
        controller = _controller;
        emit ControllerUpdated(address(0), _controller);
    }

    function setController(address newController) external onlyOwner {
        if (newController == address(0)) revert InvalidController();
        emit ControllerUpdated(controller, newController);
        controller = newController;
    }
}
