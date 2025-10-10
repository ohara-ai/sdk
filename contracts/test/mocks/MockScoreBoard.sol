// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IScoreBoard} from "../../src/interfaces/IScoreBoard.sol";

contract MockScoreBoard is IScoreBoard {
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
}
