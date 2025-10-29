// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {GameScore} from "../../features/game/GameScore.sol";
import {OwnedFactory} from "../../base/OwnedFactory.sol";

/**
 * @title ScoreFactory
 * @notice Factory for deploying Score contracts
 */
contract ScoreFactory is OwnedFactory {
    // Deployment limits
    uint256 public maxLosersPerMatch;
    uint256 public maxTotalPlayers;
    uint256 public maxTotalMatches;

    event GameScoreDeployed(
        address indexed instance,
        address indexed owner
    );
    event DeploymentLimitsUpdated(
        uint256 maxLosersPerMatch,
        uint256 maxTotalPlayers,
        uint256 maxTotalMatches
    );

    constructor() OwnedFactory(msg.sender) {
        // Initialize with default limits
        maxLosersPerMatch = 50;
        maxTotalPlayers = 1000;
        maxTotalMatches = 100;
    }

    /**
     * @notice Update the limits used for new deployments
     * @param _maxLosersPerMatch Maximum losers per match
     * @param _maxTotalPlayers Maximum total players
     * @param _maxTotalMatches Maximum total matches
     */
    function setDeploymentLimits(
        uint256 _maxLosersPerMatch,
        uint256 _maxTotalPlayers,
        uint256 _maxTotalMatches
    ) external onlyOwner {
        maxLosersPerMatch = _maxLosersPerMatch;
        maxTotalPlayers = _maxTotalPlayers;
        maxTotalMatches = _maxTotalMatches;
        emit DeploymentLimitsUpdated(_maxLosersPerMatch, _maxTotalPlayers, _maxTotalMatches);
    }

    /**
     * @notice Deploy a new GameScore contract
     * @return instance Address of the deployed contract
     * @dev The caller (msg.sender) will be set as the controller of the deployed contract
     */
    function deployGameScore() external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        instance = address(
            new GameScore(instanceOwnerAddress, msg.sender, maxLosersPerMatch, maxTotalPlayers, maxTotalMatches)
        );
        emit GameScoreDeployed(instance, instanceOwnerAddress);
    }
}
