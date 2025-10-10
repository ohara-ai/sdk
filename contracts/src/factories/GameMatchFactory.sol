// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {GameMatch} from "../features/game-match/GameMatch.sol";
import {Owned} from "../base/Owned.sol";

/**
 * @title GameMatchFactory
 * @notice Factory for deploying GameMatch contracts
 */
contract GameMatchFactory is Owned {
    event GameMatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller
    );

    constructor() Owned(msg.sender) {}

    /**
     * @notice Deploy a new GameMatch contract
     * @param _owner Owner of the new contract
     * @param _controller Controller of the new contract
     * @return instance Address of the deployed contract
     */
    function deployGameMatch(
        address _owner,
        address _controller
    ) external returns (address instance) {
        instance = address(new GameMatch(_owner, _controller));
        emit GameMatchDeployed(instance, _owner, _controller);
    }
}
