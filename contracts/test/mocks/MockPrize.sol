// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IPrize} from "../../src/interfaces/game/IPrize.sol";

contract MockPrize is IPrize {
    struct MatchRecord {
        address winner;
        address token;
        uint256 timestamp;
    }

    MatchRecord[] public matchResults;
    
    function recordMatchResult(address winner, address token) external override {
        matchResults.push(MatchRecord({
            winner: winner,
            token: token,
            timestamp: block.timestamp
        }));
    }

    function claimPrize(uint256) external pure override {
        // Mock implementation
    }

    function getPool(uint256) external pure override returns (
        address token,
        uint256 matchesCompleted,
        bool finalized,
        uint256 prizeAmount
    ) {
        return (address(0), 0, false, 0);
    }

    function getPoolWinners(uint256) external pure override returns (
        address[] memory winners,
        uint256[] memory winCounts,
        bool[] memory claimed
    ) {
        return (new address[](0), new uint256[](0), new bool[](0));
    }

    function getPoolWins(uint256, address) external pure override returns (uint256) {
        return 0;
    }

    function getPrizeForRank(uint256, uint256) external pure override returns (uint256) {
        return 0;
    }

    function getCurrentPoolId(address) external pure override returns (uint256) {
        return 1;
    }

    function getMatchesPerPool() external pure override returns (uint256) {
        return 10;
    }

    function getWinnersCount() external pure override returns (uint256) {
        return 10;
    }

    function getDistributionStrategy() external pure override returns (DistributionStrategy) {
        return DistributionStrategy.Linear;
    }

    // Test helpers
    function getMatchResultCount() external view returns (uint256) {
        return matchResults.length;
    }

    function getMatchResult(uint256 index) external view returns (address winner, address token, uint256 timestamp) {
        MatchRecord memory record = matchResults[index];
        return (record.winner, record.token, record.timestamp);
    }
}
