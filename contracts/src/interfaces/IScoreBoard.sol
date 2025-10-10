// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IScoreBoard
 * @notice Interface for tracking match results
 */
interface IScoreBoard {
    /**
     * @notice Record a match result
     * @param matchId The ID of the match
     * @param winner The address of the winner
     * @param losers Array of addresses of losers
     * @param prize The total prize amount
     */
    function recordMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata losers,
        uint256 prize
    ) external;
}
