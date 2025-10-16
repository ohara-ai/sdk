// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {GameMatch} from "../features/game-match/GameMatch.sol";
import {OwnedFactory} from "../base/OwnedFactory.sol";

/**
 * @title GameMatchFactory
 * @notice Factory for deploying GameMatch contracts
 */
contract GameMatchFactory is OwnedFactory {
    // Default capacity limit for new deployments
    uint256 public defaultMaxActiveMatches;

    event GameMatchDeployed(
        address indexed instance,
        address indexed owner,
        address indexed controller,
        address scoreBoard
    );
    event DefaultMaxActiveMatchesUpdated(uint256 newDefault);

    constructor() OwnedFactory(msg.sender) {
        // Initialize with default limit
        defaultMaxActiveMatches = 100;
    }

    /**
     * @notice Update the default max active matches for new deployments
     * @param _defaultMaxActiveMatches Default maximum active matches
     */
    function setDefaultMaxActiveMatches(uint256 _defaultMaxActiveMatches) external onlyOwner {
        defaultMaxActiveMatches = _defaultMaxActiveMatches;
        emit DefaultMaxActiveMatchesUpdated(_defaultMaxActiveMatches);
    }

    /**
     * @notice Deploy a new GameMatch contract with full configuration
     * @param _controller Controller of the new contract
     * @param _scoreBoard Scoreboard contract address (address(0) if not used)
     * @param _feeRecipients Array of fee recipient addresses
     * @param _feeShares Array of fee shares in basis points (100 = 1%)
     * @return instance Address of the deployed contract
     */
    function deployGameMatch(
        address _controller,
        address _scoreBoard,
        address[] memory _feeRecipients,
        uint256[] memory _feeShares
    ) external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        instance = address(
            new GameMatch(
                instanceOwnerAddress,
                _controller,
                _scoreBoard,
                _feeRecipients,
                _feeShares,
                defaultMaxActiveMatches
            )
        );
        emit GameMatchDeployed(instance, instanceOwnerAddress, _controller, _scoreBoard);
    }
}
