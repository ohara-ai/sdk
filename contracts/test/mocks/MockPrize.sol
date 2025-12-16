// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IPrize} from "../../src/interfaces/game/IPrize.sol";

contract MockPrize is IPrize {
    struct MatchRecord {
        address winner;
        uint256 timestamp;
    }

    MatchRecord[] public matchResults;
    
    function recordMatchResult(address winner) external override {
        matchResults.push(MatchRecord({
            winner: winner,
            timestamp: block.timestamp
        }));
    }

    function claimPrize(uint256) external pure override {
        // Mock implementation
    }

    function getPool(uint256) external pure override returns (
        uint256 matchesCompleted,
        address winner,
        uint256 highestWins,
        bool finalized,
        bool prizeClaimed
    ) {
        return (0, address(0), 0, false, false);
    }

    function getPoolWins(uint256, address) external pure override returns (uint256) {
        return 0;
    }

    function getPoolPrize(uint256, address) external pure override returns (uint256) {
        return 0;
    }

    function getCurrentPoolId() external pure override returns (uint256) {
        return 1;
    }

    function getMatchesPerPool() external pure override returns (uint256) {
        return 10;
    }

    // Test helpers
    function getMatchResultCount() external view returns (uint256) {
        return matchResults.length;
    }

    function getMatchResult(uint256 index) external view returns (address winner, uint256 timestamp) {
        MatchRecord memory record = matchResults[index];
        return (record.winner, record.timestamp);
    }
}
