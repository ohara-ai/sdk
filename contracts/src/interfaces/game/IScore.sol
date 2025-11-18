// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IScore
 * @notice Interface for tracking match results
 */
interface IScore {
    /**
     * @notice Record a match result
     * @param winner The address of the winner
     * @param losers Array of addresses of losers
     * @param prize The total prize amount
     */
    function recordMatchResult(
        address winner,
        address[] calldata losers,
        uint256 prize
    ) external;
}
