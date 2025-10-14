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
        address indexed controller,
        address scoreBoard
    );

    constructor() Owned(msg.sender) {}

    /**
     * @notice Deploy a new GameMatch contract with full configuration
     * @param _owner Owner of the new contract
     * @param _controller Controller of the new contract
     * @param _scoreBoard Scoreboard contract address (address(0) if not used)
     * @param _feeRecipients Array of fee recipient addresses
     * @param _feeShares Array of fee shares in basis points (100 = 1%)
     * @return instance Address of the deployed contract
     */
    function deployGameMatch(
        address _owner,
        address _controller,
        address _scoreBoard,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external returns (address instance) {
        instance = address(
            new GameMatch(_owner, _controller, _scoreBoard, _feeRecipients, _feeShares)
        );
        emit GameMatchDeployed(instance, _owner, _controller, _scoreBoard);
    }
}
