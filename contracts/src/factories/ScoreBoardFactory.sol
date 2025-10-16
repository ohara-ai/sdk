// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ScoreBoard} from "../features/scoreboard/ScoreBoard.sol";
import {OwnedFactory} from "../base/OwnedFactory.sol";

/**
 * @title ScoreBoardFactory
 * @notice Factory for deploying ScoreBoard contracts
 */
contract ScoreBoardFactory is OwnedFactory {
    event ScoreBoardDeployed(
        address indexed instance,
        address indexed owner
    );

    constructor() OwnedFactory(msg.sender) {}

    /**
     * @notice Deploy a new ScoreBoard contract
     * @return instance Address of the deployed contract
     */
    function deployScoreBoard() external returns (address instance) {
        address instanceOwnerAddress = getInstanceOwner();
        
        instance = address(new ScoreBoard(instanceOwnerAddress));
        emit ScoreBoardDeployed(instance, instanceOwnerAddress);
    }
}
