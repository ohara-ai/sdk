// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IScore} from "../../src/interfaces/game/IScore.sol";

contract MockScore is IScore {
    struct MatchResult {
        uint256 matchId;
        address winner;
        address[] losers;
        uint256 prize;
    }

    MatchResult[] public results;

    function recordMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prize
    ) external override {
        MatchResult storage result = results.push();
        result.matchId = matchId;
        result.winner = winner;
        result.losers = losers;
        result.prize = prize;
    }

    function getResultCount() external view returns (uint256) {
        return results.length;
    }

    function getResult(uint256 index) external view returns (MatchResult memory) {
        return results[index];
    }

    function recordMatchCalled() external view returns (bool) {
        return results.length > 0;
    }
}
